import masterDB from "../config/master_db.tsx";
import appDB from "../config/db.tsx";

const ITEM_TYPES = ["part", "intermediate", "product"] as const;
type ItemType = typeof ITEM_TYPES[number];

type PartData = {
    part_id: string;
    item_name: string;
    item_type: ItemType;
}

type BomData = {
    bom_id: string;
    bom_name: string;
    bom_description: string;
    item_name: string;
}

type BompartData = {
    bom_id: string;
    item_name: string;
    item_qty: number;
}

type itemData = {
    item_id: number;
    item_name: string;
    item_type: ItemType;
    item_stock: number;
}

type inputData = {
    input_id: string;
    item_name: string;
    input_date: string;
    input_qty: number;
    input_source: string;
}

type achievementData = {
    achievement_id: string;
    item_name: string;
    item_type: string;
    achievement_date: string;
    achievement_qty: number;
}

type consumeData = {
    consume_id: number;
    item_name: string;
    item_type: ItemType;
    achievement_id: string;
}

type outputData = {
    output_id: number;
    item_name: string;
    output_date: string;
    output_qty: number;
    output_customer: string;
}

type masterData = {
    parts: PartData[];
    boms: BomData[];
    bomparts: BompartData[];
}

export type serializeType = {
    items: itemData[];
    inputs: inputData[];
    outputs: outputData[];
    achievements: achievementData[];
    consumes: consumeData[];
    masters: masterData;
}

const serialize = (): serializeType => {
    const items = appDB.prepare(
        `SELECT item_id, item_name, item_type, item_stock FROM items ORDER BY item_name`,
    ).all() as itemData[];

    const inputs = appDB.prepare(
        `SELECT input_id, item_name, input_date, input_qty, input_source FROM inputs ORDER BY input_id`,
    ).all() as inputData[];

    const outputs = appDB.prepare(
        `SELECT output_id, item_name, output_date, output_qty, output_customer FROM outputs ORDER BY output_id`,
    ).all() as outputData[];

    const achievements = appDB.prepare(
        `SELECT achievement_id, item_name, item_type, achievement_date, achievement_qty FROM achievements ORDER BY achievement_id`,
    ).all() as achievementData[];

    const consumes = appDB.prepare(
        `SELECT consume_id, item_name, item_type, achievement_id FROM consumes ORDER BY consume_id`,
    ).all() as consumeData[];

    const parts = masterDB.prepare(
        `SELECT part_id, item_name, item_type FROM parts ORDER BY part_id`,
    ).all() as PartData[];

    const boms = masterDB.prepare(
        `SELECT bom_id, bom_name, bom_description, item_name FROM boms ORDER BY bom_id`,
    ).all() as BomData[];

    const bomparts = masterDB.prepare(
        `SELECT bom_id, item_name, item_qty FROM bomparts ORDER BY bom_id, item_name`,
    ).all() as BompartData[];

    return {
        items,
        inputs,
        outputs,
        achievements,
        consumes,
        masters: {
            parts,
            boms,
            bomparts,
        },
    };
};

export const deserialize = (data: serializeType): void => {
    const insertPart = masterDB.prepare(
        `INSERT INTO parts (part_id, item_name, item_type) VALUES (?, ?, ?)`,
    );
    const insertBom = masterDB.prepare(
        `INSERT INTO boms (bom_id, item_name, bom_name, bom_description) VALUES (?, ?, ?, ?)`,
    );
    const insertBompart = masterDB.prepare(
        `INSERT INTO bomparts (bom_id, item_name, item_qty) VALUES (?, ?, ?)`,
    );

    const insertItem = appDB.prepare(
        `INSERT INTO items (item_id, item_name, item_type, item_stock) VALUES (?, ?, ?, ?)`,
    );
    const insertInput = appDB.prepare(
        `INSERT INTO inputs (input_id, item_name, input_date, input_qty, input_source) VALUES (?, ?, ?, ?, ?)`,
    );
    const insertOutput = appDB.prepare(
        `INSERT INTO outputs (output_id, item_name, output_date, output_qty, output_customer) VALUES (?, ?, ?, ?, ?)`,
    );
    const insertAchievement = appDB.prepare(
        `INSERT INTO achievements (achievement_id, item_name, item_type, achievement_date, achievement_qty) VALUES (?, ?, ?, ?, ?)`,
    );
    const insertConsume = appDB.prepare(
        `INSERT INTO consumes (consume_id, item_name, item_type, achievement_id) VALUES (?, ?, ?, ?)`,
    );

    const replaceAppDB = appDB.transaction(() => {
        appDB.prepare(`DELETE FROM consumes`).run();
        appDB.prepare(`DELETE FROM outputs`).run();
        appDB.prepare(`DELETE FROM achievements`).run();
        appDB.prepare(`DELETE FROM inputs`).run();
        appDB.prepare(`DELETE FROM items`).run();

        for (const item of data.items) {
            insertItem.run(item.item_id, item.item_name, item.item_type, item.item_stock);
        }
        for (const input of data.inputs) {
            insertInput.run(input.input_id, input.item_name, input.input_date, input.input_qty, input.input_source);
        }
        for (const output of data.outputs) {
            insertOutput.run(output.output_id, output.item_name, output.output_date, output.output_qty, output.output_customer);
        }
        for (const achievement of data.achievements) {
            insertAchievement.run(
                achievement.achievement_id,
                achievement.item_name,
                achievement.item_type,
                achievement.achievement_date,
                achievement.achievement_qty,
            );
        }
        for (const consume of data.consumes) {
            insertConsume.run(consume.consume_id, consume.item_name, consume.item_type, consume.achievement_id);
        }
    });

    const replaceMasterDB = masterDB.transaction(() => {
        masterDB.prepare(`DELETE FROM bomparts`).run();
        masterDB.prepare(`DELETE FROM boms`).run();
        masterDB.prepare(`DELETE FROM parts`).run();

        for (const part of data.masters.parts) {
            insertPart.run(part.part_id, part.item_name, part.item_type);
        }
        for (const bom of data.masters.boms) {
            insertBom.run(bom.bom_id, bom.item_name, bom.bom_name, bom.bom_description);
        }
        for (const bompart of data.masters.bomparts) {
            insertBompart.run(bompart.bom_id, bompart.item_name, bompart.item_qty);
        }

    });

    replaceAppDB();
    replaceMasterDB();
};

export default { serialize, deserialize };
