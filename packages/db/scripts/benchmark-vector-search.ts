import { closeDatabase, getQueryClient } from "../src/client";

const queryClient = getQueryClient();

const rowCount = Number(process.env.VECTOR_BENCH_ROWS ?? 10_000);
const iterations = Number(process.env.VECTOR_BENCH_ITERATIONS ?? 100);
const budgetMs = Number(process.env.VECTOR_SEARCH_BUDGET_MS ?? 200);

if (!Number.isInteger(rowCount) || rowCount < 1_000) {
  throw new Error("VECTOR_BENCH_ROWS must be an integer of at least 1000");
}

const queryVector = `[${Array.from(
  { length: 1536 },
  (_, index) => ((index * 7919) % 10_007) / 10_007,
).join(",")}]`;

function percentile(values: number[], fraction: number): number {
  return values[Math.ceil(values.length * fraction) - 1] ?? 0;
}

try {
  await queryClient`create temporary table lobe_vector_benchmark (
    id bigint generated always as identity primary key,
    embedding vector(1536) not null
  )`;
  await queryClient.unsafe(`
    insert into lobe_vector_benchmark (embedding)
    select array(
      select (((dimension * 7919 + row_id * 104729) % 10007)::real / 10007)
      from generate_series(1, 1536) as dimension
    )::vector(1536)
    from generate_series(1, ${rowCount}) as row_id
  `);
  await queryClient`
    create index lobe_vector_benchmark_hnsw_idx
    on lobe_vector_benchmark using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 96)
  `;
  await queryClient`analyze lobe_vector_benchmark`;
  await queryClient`set hnsw.ef_search = 80`;

  const explain = await queryClient.unsafe<Array<{ "QUERY PLAN": unknown }>>(
    `explain (format json) select id from lobe_vector_benchmark order by embedding <=> '${queryVector}'::vector limit 30`,
  );
  const plan = JSON.stringify(explain);
  if (!plan.includes("lobe_vector_benchmark_hnsw_idx")) {
    throw new Error("Postgres did not choose the HNSW index");
  }

  for (let index = 0; index < 10; index += 1) {
    await queryClient.unsafe(
      `select id from lobe_vector_benchmark order by embedding <=> '${queryVector}'::vector limit 30`,
    );
  }

  const durations: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    await queryClient.unsafe(
      `select id from lobe_vector_benchmark order by embedding <=> '${queryVector}'::vector limit 30`,
    );
    durations.push(performance.now() - startedAt);
  }

  durations.sort((left, right) => left - right);
  const result = {
    rows: rowCount,
    iterations,
    p50Ms: Number(percentile(durations, 0.5).toFixed(2)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
    maxMs: Number((durations.at(-1) ?? 0).toFixed(2)),
    budgetMs,
    index: "hnsw",
  };

  console.log(JSON.stringify(result, null, 2));
  if (result.maxMs >= budgetMs) {
    throw new Error(
      `Vector search exceeded the ${budgetMs} ms budget (${result.maxMs} ms max)`,
    );
  }
} finally {
  await closeDatabase();
}
