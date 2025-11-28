import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);


//const sql = postgres();

//Create a new user
const createUser = async (username, email, password_hash) => {
  const id = crypto.randomUUID();
  
  const result = await sql`
    INSERT INTO users (id, username, email, password_hash)
    VALUES (${id}, ${username}, ${email}, ${password_hash})
    RETURNING *;
  `;

  return result;
}

//Get user from email (each user should have a unique email)
const getUserFromEmail = async (email) => {
  const result = await sql`
    SELECT * FROM users
    WHERE LOWER(email) = LOWER(${email});
  `;

  return result;
}

//Get user from username
const getUserFromUsername = async (username) => {
  const result = await sql`
    SELECT * FROM users
    WHERE LOWER(username) = LOWER(${username});
  `;

  return result;
}

//Get user by ID
const readUser = async (id) => {
  const result = await sql`
    SELECT id, username, email, name, avatar_url, bio, address, phone
    FROM users
    WHERE id = ${id}::uuid;
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0];
}

//Update user information (name, email or password) (only accessible from user page)
const updateUser = async (id, userdata) => {
  const { username, email, password_hash, name, avatar_url, bio, address, phone } = userdata;

  // Build dynamic update query based on provided fields
  const updates = [];
  const values = [];
  
  if (username !== undefined) {
    updates.push(`username = $${values.length + 1}`);
    values.push(username);
  }
  if (email !== undefined) {
    updates.push(`email = $${values.length + 1}`);
    values.push(email);
  }
  if (password_hash !== undefined) {
    updates.push(`password_hash = $${values.length + 1}`);
    values.push(password_hash);
  }
  if (name !== undefined) {
    updates.push(`name = $${values.length + 1}`);
    values.push(name);
  }
  if (avatar_url !== undefined) {
    updates.push(`avatar_url = $${values.length + 1}`);
    values.push(avatar_url);
  }
  if (bio !== undefined) {
    updates.push(`bio = $${values.length + 1}`);
    values.push(bio);
  }
  if (address !== undefined) {
    updates.push(`address = $${values.length + 1}`);
    values.push(address);
  }
  if (phone !== undefined) {
    updates.push(`phone = $${values.length + 1}`);
    values.push(phone);
  }

  if (updates.length === 0) {
    // No fields to update, just return current user
    const result = await sql`SELECT * FROM users WHERE id=${id}`;
    return result;
  }

  // Use parameterized query with sql template
  const updateClause = updates.join(', ');
  const query = `UPDATE users SET ${updateClause} WHERE id = $${values.length + 1} RETURNING *`;
  values.push(id);

  // Execute with sql template (safer approach)
  const result = await sql.unsafe(query, values);

  return result;
}

//Delete a user (should only be accessible from user page)
const deleteUser = async (id) => {
  const result = await sql`DELETE FROM users WHERE id=${id} RETURNING *;`;

  console.log(result);
}

export { createUser, getUserFromEmail, getUserFromUsername, updateUser, deleteUser, readUser }