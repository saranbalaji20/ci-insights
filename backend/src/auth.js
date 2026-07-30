import bcrypt from 'bcrypt';
import { pool } from './db.js';

const MIN_PASSWORD_LENGTH = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function publicUser(user) {
  return { id: user.id, email: user.email };
}

export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'You must be logged in.' });
  }

  req.user = req.session.user;
  next();
}

export async function signUp(req, res) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `insert into users (email, password_hash)
       values ($1, $2)
       returning id, email`,
      [email, passwordHash]
    );
    const user = publicUser(rows[0]);
    req.session.user = user;
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error('Signup failed:', err);
    res.status(500).json({ error: 'Unable to create account.' });
  }
}

export async function logIn(req, res) {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const { rows } = await pool.query(
      'select id, email, password_hash from users where email = $1',
      [email]
    );
    const account = rows[0];
    const passwordMatches = account && await bcrypt.compare(password, account.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = publicUser(account);
    req.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error('Session regeneration failed:', sessionError);
        return res.status(500).json({ error: 'Unable to start session.' });
      }
      req.session.user = user;
      res.json({ user });
    });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Unable to log in.' });
  }
}

export function logOut(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout failed:', err);
      return res.status(500).json({ error: 'Unable to log out.' });
    }
    res.clearCookie('ci_insight_session');
    res.status(204).end();
  });
}
