import postgres from "postgres";

const sql = postgres();

//Create a new task
const createTask = async (task) => {
  const id = crypto.randomUUID();
  
  const { name, description, location, price, type, userId } = task;
  
  // Use userId from task, or default to 'anonymous'
  const user_id = userId || 'anonymous';
  const task_type = type || 'need';
  const task_price = price ? parseFloat(price) : 0;
  const task_location = location || 'Espoo, Finland';
  
  const result = await sql`
    INSERT INTO tasks (id, name, description, user_id, location, price, type)
    VALUES (${id}, ${name}, ${description}, ${user_id}, ${task_location}, ${task_price}, ${task_type})
    RETURNING *;
  `;

  return result[0];
}

//Get task with id
const readTask = async (id) => {
  const result = await sql`
    SELECT * FROM tasks WHERE id=${id};
  `;

  return result[0];
}

//Update a task of a given ID
const updateTask = async (id, task) => {
  const { name, description, location, price, type } = task;
  
  const task_price = price ? parseFloat(price) : 0;
  const task_location = location || 'Espoo, Finland';
  const task_type = type || 'need';

  const result = await sql`
    UPDATE tasks
    SET name=${name}, description=${description}, location=${task_location}, price=${task_price}, type=${task_type}, time=CURRENT_TIMESTAMP
    WHERE id=${id}
    RETURNING *;
  `;

  return result[0];
}

//Delete a task 
const deleteTask = async (id) => {
  const result = await sql`DELETE FROM tasks WHERE id=${id} RETURNING *;`;
  return result[0];
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