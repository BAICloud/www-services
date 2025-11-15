import postgres from "postgres";
/*
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
*/

const sql = postgres();

//Create a new task
const createTask = async (userID, task) => {
  const id = crypto.randomUUID();
  
  const { name, description, location, category, type, price } = task;
  
  const result = await sql`
    INSERT INTO tasks (id, name, description, user_id, location, category, type, price)
    VALUES (${id}, ${name}, ${description}, ${userID}, ${location}, ${category}, ${type}, ${price})
    RETURNING *;
  `;

  console.log(result[0]);
  return result[0];
}

//Get task with id
const readTask = async (id) => {
  const result = await sql`
    SELECT * FROM tasks WHERE id=${id};
  `;

  if(result.length === 0) {
    return null;
  }
  
  return result[0];
}

//Update a task of a given ID
const updateTask = async (id, task) => {
  const { name, description, location, price } = task;

  const result = await sql`
    UPDATE tasks
    SET name=${name}, description=${description}, location=${location}, price=${price}, time=CURRENT_TIMESTAMP
    WHERE id=${id}
    RETURNING *;
  `;

  return result[0];
}

//Delete a task 
const deleteTask = async (id) => {
  const result = await sql`DELETE FROM tasks WHERE id=${id} RETURNING *;`;

  console.log(result);
}

const listAllTasks = async () => {
  const result = await sql`
    SELECT * FROM tasks
    ORDER BY time DESC;
  `;

  return result;
}

const markTaskAsComplete = async (id) => {
  const result = await sql `
    UPDATE tasks
    SET completed=${true}, time=CURRENT_TIMESTAMP
    WHERE id=${id}
  `;
}

const markTaskAsIncomplete = async (id) => {
  const result = await sql `
    UPDATE tasks
    SET completed=${false}, time=CURRENT_TIMESTAMP
    WHERE id=${id}
  `;
}

export { createTask, readTask, updateTask, deleteTask, listAllTasks, markTaskAsComplete, markTaskAsIncomplete }