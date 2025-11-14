CREATE TYPE task_type AS ENUM ('need', 'offer');

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id UUID NOT NULL,
  location TEXT NOT NULL,
  category TEXT,
  type task_type NOT NULL, 
  price FLOAT8 NOT NULL,
  completed BOOLEAN DEFAULT false
);