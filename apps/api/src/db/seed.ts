import { loadConfig } from '../config.js';
import { demoPatients } from '../payers/mockData.js';
import { DrizzlePatientRepository } from '../services/CheckRepository.js';
import { createDb } from './client.js';

const config = loadConfig();
const db = createDb(config.DATABASE_URL);
await new DrizzlePatientRepository(db).upsertMany(demoPatients);
console.log(`Seeded ${demoPatients.length} patients into ${config.DATABASE_URL}`);
