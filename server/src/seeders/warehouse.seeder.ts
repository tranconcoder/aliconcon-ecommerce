/**
 * @file warehouse.seeder.ts
 * @description Seeder for initializing warehouses and their spatial locations.
 */

import mongoose from 'mongoose';
import warehouseModel from '@/models/warehouse.model.js';
import { locationModel, provinceModel, districtModel, wardModel } from '@/models/location.model.js';
import { seederDataManager } from './data/index.js';
import type { IWarehouseData } from './data/warehouse.data.ts';
import { Seeder } from './seeder.js';

class WarehouseSeeder extends Seeder {
    private warehouses: IWarehouseData[] = [];

    constructor() {
        super('Warehouse');
    }

    protected async prepare(): Promise<void> {
        this.warehouses = seederDataManager.table<IWarehouseData>('warehouses')?.getAll() || [];
    }

    protected async validate(): Promise<void> {
        if (!this.warehouses.length) throw new Error('No warehouse data found');
    }

    protected async seed(): Promise<void> {
        for (const w of this.warehouses) {
            // Resolve location
            const province = await provinceModel.findOne({ province_name: w.provinceName });
            const district = await districtModel.findOne({ district_name: w.districtName, province: province?._id });
            const ward = await wardModel.findOne({ ward_name: w.wardName, district: district?._id });

            if (!province || !district || !ward) {
                console.error(`    ❌ Location not found for warehouse: ${w.name}`);
                continue;
            }

            // Upsert location with hardcoded coordinates for HCM District 1 if it matches the flagship warehouse
            // Otherwise, we should probably call a geocoding service, but for seed we can use defaults
            const coordinates = (w._id === '000000000000000000000001') 
                ? { x: 106.7009, y: 10.7769 } // HCM District 1 coordinates
                : { x: 106.660172, y: 10.762622 }; // General HCM

            const location = await locationModel.findOneAndUpdate(
                { province: province._id, district: district._id, ward: ward._id, address: w.address },
                {
                    province: province._id,
                    district: district._id,
                    ward: ward._id,
                    address: w.address,
                    text: `${w.address}, ${w.wardName}, ${w.districtName}, ${w.provinceName}`,
                    coordinates
                },
                { upsert: true, new: true }
            );

            // Upsert warehouse
            const warehousePayload = {
                _id: new mongoose.Types.ObjectId(w._id),
                name: w.name,
                phoneNumber: w.phoneNumber,
                shop: new mongoose.Types.ObjectId(w.shop),
                stock: w.stock,
                address: location._id
            };

            await warehouseModel.findOneAndUpdate(
                { _id: warehousePayload._id },
                warehousePayload,
                { upsert: true, new: true }
            );

            console.log(`    ✓ Warehouse: ${w.name}`);
        }
    }
}

export const warehouseSeeder = new WarehouseSeeder();
