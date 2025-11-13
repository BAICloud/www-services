CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE UNIQUE INDEX ON users(username);
CREATE UNIQUE INDEX ON users(lower(email));