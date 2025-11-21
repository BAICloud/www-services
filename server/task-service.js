import postgres from "postgres";
/*
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
*/

const sql = postgres();

//Create a new task
const createTask = async (userID, task) => {
  const id = crypto.randomUUID();
  
<<<<<<< HEAD
  const { name, description, location, category, type, price } = task;
  
  const result = await sql`
    INSERT INTO tasks (id, name, description, user_id, location, category, type, price)
    VALUES (${id}, ${name}, ${description}, ${userID}, ${location}, ${category}, ${type}, ${price})
=======
  const { name, description, location, price, type } = task;
  
  // Validate and convert userID to UUID format
  // If userID is not a valid UUID, generate one or use a default
  let userIdUuid = userID;
  try {
    // Try to validate if it's a valid UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userID)) {
      // Not a valid UUID, generate a new one or use a default anonymous UUID
      userIdUuid = '00000000-0000-0000-0000-000000000000'; // Anonymous user UUID
    }
  } catch (e) {
    userIdUuid = '00000000-0000-0000-0000-000000000000';
  }
  
  const taskType = type || 'need';
  const taskPrice = price ? parseFloat(price) : 0;
  const taskLocation = location || 'Espoo, Finland';
  
  const result = await sql`
    INSERT INTO tasks (id, name, description, user_id, location, price, type)
    VALUES (${id}, ${name}, ${description}, ${userIdUuid}::uuid, ${taskLocation}, ${taskPrice}, ${taskType}::task_type)
>>>>>>> 2363e5d66071eec9170cd5f27c81ba77e62374b4
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
  const { name, description, location, price, type } = task;
  
  const taskType = type || 'need';
  const taskPrice = price ? parseFloat(price) : 0;
  const taskLocation = location || 'Espoo, Finland';

  const result = await sql`
    UPDATE tasks
    SET name=${name}, description=${description}, location=${taskLocation}, price=${taskPrice}, type=${taskType}::task_type, time=CURRENT_TIMESTAMP
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