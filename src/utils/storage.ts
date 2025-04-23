import os from "os";
import { dirname, join, resolve } from "path";
import { promises as fs } from "fs";

type Storage = {
    token?: string;
    [key: string]: any;
};

export class StorageManager {
    private static readonly storagePath = resolve(
        join(os.homedir(), ".stat", "storage.stat")
    );

    private static storage: Storage = {};

    public static async load(): Promise<Storage> {
        try {
            const data = await fs.readFile(this.storagePath, "utf-8");
            this.storage = JSON.parse(data);
        } catch {
            this.storage = {};
        }
        return this.storage;
    }

    public static async save(): Promise<void> {
        const directory = dirname(this.storagePath);
        await fs.mkdir(directory, { recursive: true });
        const data = JSON.stringify(this.storage, null, 2);
        await fs.writeFile(this.storagePath, data, "utf-8");
    }

    public static async update(
        updater: (current: Storage) => Storage | Promise<Storage>
    ): Promise<Storage> {
        const updated = await updater(this.storage);
        this.storage = updated;
        await this.save();
        return this.storage;
    }

    public static async get(): Promise<Storage> {
        if (Object.keys(this.storage).length === 0) {
            await this.load();
        }
        return { ...this.storage };
    }

    public static async clear(): Promise<void> {
        this.storage = {};
        await this.save();
    }
}
