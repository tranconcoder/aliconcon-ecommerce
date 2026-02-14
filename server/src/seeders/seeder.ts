/**
 * @file seeder.ts
 * @description Defines the abstract base class for all seeders in the system.
 */

/* ---------------------------------------------------------- */
/*                        Seeder Class                        */
/* ---------------------------------------------------------- */

/**
 * Abstract seeder with a fixed middleware-like lifecycle pipeline.
 * Every seeder goes through the same 3 phases in order:
 *
 *   1. prepare()  — Load and transform raw data into a usable format
 *   2. validate() — Check preconditions and dependencies (e.g., required records exist)
 *   3. seed()     — Execute the actual upsert operations
 *
 * Subclasses implement each phase. If a phase is not needed, return a no-op.
 */
export abstract class Seeder {
    /**
     * Initializes a new instance of the Seeder class.
     * @param name - The human-readable name of the seeder.
     */
    constructor(public readonly name: string) {}

    /** 
     * Phase 1: Prepare
     * Load and transform raw data from data sources (JSON, Data Classes, etc.).
     */
    protected abstract prepare(): Promise<void>;

    /** 
     * Phase 2: Validate
     * Validate preconditions and dependencies before proceeding with the seed.
     */
    protected abstract validate(): Promise<void>;

    /** 
     * Phase 3: Seed
     * Execute upsert operations against the database.
     */
    protected abstract seed(): Promise<void>;

    /** 
     * Run all phases sequentially (Prepare -> Validate -> Seed).
     * This coordinates the overall seeding process for the specific instance.
     */
    async run(): Promise<void> {
        console.log(`\n🌱 [${this.name}] Starting...`);

        // Step 1: Prepare
        console.log(`  ▸ Preparing data...`);
        await this.prepare();
        console.log(`  ✓ Data prepared`);

        // Step 2: Validate
        console.log(`  ▸ Validating dependencies...`);
        await this.validate();
        console.log(`  ✓ Validation passed`);

        // Step 3: Seed
        console.log(`  ▸ Seeding...`);
        await this.seed();
        console.log(`  ✓ Seeding complete`);

        console.log(`✅ [${this.name}] Done\n`);
    }
}
