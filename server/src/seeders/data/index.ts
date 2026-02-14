/**
 * @file data/index.ts
 * @description Core data management components for the seeding system.
 * Implements a registry pattern for seed data sources.
 */

/* ---------------------------------------------------------- */
/*                      Data Management                       */
/* ---------------------------------------------------------- */

/**
 * Manages a list of objects converted from raw tuple data.
 * Provides basic query capabilities to the seeder logic.
 */
export class SeederDataTable<T> {
    constructor(private items: T[]) {}

    /**
     * @description Returns all items in the table.
     * @returns {T[]} An array containing all items.
     */
    public getAll(): T[] {
        return this.items;
    }

    /**
     * @description Finds a single item based on a predicate.
     * @param {function(item: T): boolean} predicate - A function to test each element.
     * @returns {T | undefined} The first element that satisfies the predicate, or undefined.
     */
    public findOne(predicate: (item: T) => boolean): T | undefined {
        return this.items.find(predicate);
    }

    /**
     * @description Filters items based on a predicate.
     * @param {function(item: T): boolean} predicate - A function to test each element.
     * @returns {T[]} An array containing all elements that satisfy the predicate.
     */
    public filter(predicate: (item: T) => boolean): T[] {
        return this.items.filter(predicate);
    }
}

/**
 * Abstract base class for seed data definitions.
 * Converts raw tuple data into an object array for simpler access.
 */
export abstract class SeederDataRow<T> {
    private _dataTable?: SeederDataTable<T>;

    /**
     * Subclasses should define these properties.
     */
    protected abstract titles: (keyof T)[];
    protected abstract rawData: any[][];

    constructor() {}

    /**
     * @description Lazily builds and returns the data table.
     * @returns {SeederDataTable<T>} The initialized data table instance.
     */
    public getTable(): SeederDataTable<T> {
        if (!this._dataTable) {
            const data = this.getData();
            this._dataTable = new SeederDataTable(data);
        }
        return this._dataTable;
    }

    /**
     * @description Converts raw tuples into typed objects.
     * Can be overridden by subclasses for custom transformations.
     * @returns {T[]} An array of typed objects converted from rawData.
     */
    public getData(): T[] {
        return this.rawData.map((row) => {
            const obj: Partial<T> = {};
            this.titles.forEach((title, index) => {
                obj[title] = row[index];
            });
            return obj as T;
        });
    }

    /**
     * @description Convenience method for retrieving all objects.
     * Calls getTable().getAll() which ensures lazy initialization.
     * @returns {T[]} An array containing all objects.
     */
    public getAll(): T[] {
        return this.getTable().getAll();
    }
}

/**
 * Centralized manager for all seeder data tables.
 * Implements a registry where data instances can be identified by key.
 */
export class SeederDataManager {
    private tables: Map<string, SeederDataRow<any>> = new Map();

    /**
     * @description Registers a data source instance.
     * @param {string} key - The unique registration key for the data source.
     * @param {SeederDataRow<any>} instance - The data row instance to register.
     */
    public register(key: string, instance: SeederDataRow<any>) {
        this.tables.set(key, instance);
    }

    /**
     * @description Retrieves a strongly-typed data table by its registration key.
     * @param {string} key - The registration key to look up.
     * @returns {SeederDataTable<T> | undefined} The found table, or undefined if not found.
     */
    public table<T>(key: string): SeederDataTable<T> | undefined {
        return this.tables.get(key)?.getTable();
    }
}

/**
 * Singleton instance of the manager for use throughout the application.
 */
export const seederDataManager = new SeederDataManager();
