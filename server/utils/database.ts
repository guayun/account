import postgres from 'postgres'
const sql = postgres(process.env.POSTGRES_URL, { prepare: false })
export default sql