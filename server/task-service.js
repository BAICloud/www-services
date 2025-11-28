import postgres from "postgres";
/*
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
*/

const sql = postgres();

//Create a new task
const createTask = async (userID, task) => {
  const id = crypto.randomUUID();
  
  const { name, description, location, price, type, images } = task;
  
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
  
  // Handle images - convert to JSON array if provided
  const imagesJson = images && Array.isArray(images) ? JSON.stringify(images) : '[]';
  
  try {
    // Try to insert with images column first
    const result = await sql`
      INSERT INTO tasks (id, name, description, user_id, location, price, type, images)
      VALUES (${id}, ${name}, ${description}, ${userIdUuid}::uuid, ${taskLocation}, ${taskPrice}, ${taskType}::task_type, ${imagesJson}::jsonb)
      RETURNING *;
    `;
    return result[0];
  } catch (error) {
    // If images column doesn't exist, try without it
    if (error.message && error.message.includes('column "images"')) {
      console.warn('Images column not found, inserting without images. Please run migration V4__task_images.sql');
      const result = await sql`
        INSERT INTO tasks (id, name, description, user_id, location, price, type)
        VALUES (${id}, ${name}, ${description}, ${userIdUuid}::uuid, ${taskLocation}, ${taskPrice}, ${taskType}::task_type)
        RETURNING *;
      `;
      return result[0];
    }
    // Re-throw other errors
    throw error;
  }
}

//Get task with id
const readTask = async (id) => {
  const result = await sql`
    SELECT * FROM tasks WHERE id=${id};
  `;

  if(result.length === 0) {
    return null;
  }

  const task = result[0];
  
  // Ensure images is properly parsed if it exists
  if (task.images) {
    // If images is already an array, keep it as is
    // If it's a JSONB field, it should already be parsed by postgres.js
    // But if it's a string, parse it
    if (typeof task.images === 'string') {
      try {
        task.images = JSON.parse(task.images);
      } catch (e) {
        console.warn('Failed to parse images string:', e);
        task.images = [];
      }
    }
    // Ensure it's an array
    if (!Array.isArray(task.images)) {
      task.images = [];
    }
  } else {
    task.images = [];
  }
  
  return task;
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