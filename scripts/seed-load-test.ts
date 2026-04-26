/**
 * One-shot load-test seeder for HostelOS.
 *
 * Inserts:
 *   - 200 rooms (50 × 2-share, 50 × 3-share, 50 × 4-share, 25 × 5-share, 25 × 6-share)
 *   - 725 beds total (one per capacity slot)
 *   - 700 synthetic members with realistic Indian names + phone numbers
 *   - 700 active assignments (filling ~96% of beds)
 *
 * USAGE:
 *   cd hostel-os
 *   npx tsx scripts/seed-load-test.ts <admin-email>
 *
 * Pass the admin email of the tenant you want to seed. The script looks up
 * the tenant owned by that admin and writes only into that tenant.
 *
 * Idempotent prefix: room numbers start at 9000 so they don't collide
 * with any real rooms you've already created. Members get the prefix
 * "Test " in their name so they're easy to bulk-delete later.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local explicitly — Next.js loads it for us at runtime, but
// when we run this script standalone we need to do it ourselves.
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Sai", "Ayaan",
  "Krishna", "Ishaan", "Shaurya", "Atharv", "Advik", "Kabir", "Anant", "Aryan",
  "Rudra", "Vedant", "Yash", "Dhruv", "Karan", "Rohan", "Aditya", "Siddharth",
  "Pranav", "Harsh", "Manav", "Nikhil", "Rahul", "Suresh", "Ramesh", "Mahesh",
  "Anaya", "Diya", "Saanvi", "Aadhya", "Aaradhya", "Anika", "Navya", "Kiara",
  "Myra", "Sara", "Pari", "Riya", "Aditi", "Sneha", "Pooja", "Priya",
  "Kavya", "Ananya", "Ishika", "Tanvi", "Meera", "Shreya", "Neha", "Divya",
  "Lakshmi", "Padma", "Sita", "Geeta", "Radha",
];
const SURNAMES = [
  "Sharma", "Verma", "Gupta", "Kumar", "Singh", "Patel", "Mehta", "Shah",
  "Iyer", "Nair", "Menon", "Pillai", "Rao", "Reddy", "Naidu", "Rajan",
  "Chopra", "Kapoor", "Khanna", "Malhotra", "Agarwal", "Bansal", "Joshi", "Tiwari",
  "Mishra", "Pandey", "Yadav", "Jain", "Bhat", "Desai", "Khan", "Sinha",
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName(): string {
  return `Test ${rand(FIRST_NAMES)} ${rand(SURNAMES)}`;
}

function randomPhone(): string {
  // Indian mobile format: starts with 6/7/8/9, 10 digits total
  const prefix = ["6", "7", "8", "9"][Math.floor(Math.random() * 4)];
  let n = "";
  for (let i = 0; i < 9; i++) n += Math.floor(Math.random() * 10);
  return prefix + n;
}

const ROOM_PLAN: Array<{ capacity: number; count: number; type: string }> = [
  { capacity: 2, count: 50, type: "double" },
  { capacity: 3, count: 50, type: "triple" },
  { capacity: 4, count: 50, type: "dormitory" },
  { capacity: 5, count: 25, type: "dormitory" },
  { capacity: 6, count: 25, type: "dormitory" },
];

const RENT_BY_CAPACITY: Record<number, number> = {
  2: 8500,
  3: 7000,
  4: 5500,
  5: 4800,
  6: 4200,
};

async function main() {
  const adminEmail = process.argv[2];
  if (!adminEmail || !adminEmail.includes("@")) {
    console.error(
      "✗ Pass the admin email as the first arg, e.g.\n" +
        "   npx tsx scripts/seed-load-test.ts you@example.com",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
    );
  }

  console.log("→ Connecting to Supabase…");
  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Find the tenant by admin email.
  // The Admin API "?email=" filter is silently ignored, so list all users
  // and find ours. (Same pattern as lib/supabase/admin.ts uses.)
  console.log(`→ Looking up admin user ${adminEmail}…`);
  const { data: usersList, error: usersErr } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersErr) throw usersErr;
  const adminUser = usersList.users.find(
    (u) => u.email?.toLowerCase() === adminEmail.toLowerCase(),
  );
  if (!adminUser) {
    throw new Error(`No auth user found with email ${adminEmail}`);
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, hostel_name")
    .eq("admin_user_id", adminUser.id)
    .maybeSingle();
  if (tenantErr) throw tenantErr;
  if (!tenant) {
    throw new Error(
      `No tenant found for admin user ${adminEmail} (id=${adminUser.id})`,
    );
  }
  console.log(`✓ Found tenant: ${tenant.hostel_name} (${tenant.id})`);

  // 2. Build the room payload — 200 rooms, numbered 9000-9199 so they
  // don't collide with anything you've already created.
  const rooms: Array<{
    tenant_id: string;
    room_number: string;
    room_type: string;
    floor: number;
    capacity: number;
    monthly_rent: number;
  }> = [];

  let roomNo = 9000;
  for (const slot of ROOM_PLAN) {
    for (let i = 0; i < slot.count; i++) {
      rooms.push({
        tenant_id: tenant.id,
        room_number: String(roomNo),
        room_type: slot.type,
        floor: Math.floor((roomNo - 9000) / 25) + 1, // 25 rooms per floor
        capacity: slot.capacity,
        monthly_rent: RENT_BY_CAPACITY[slot.capacity],
      });
      roomNo++;
    }
  }

  console.log(`→ Inserting ${rooms.length} rooms…`);
  const { data: insertedRooms, error: roomErr } = await supabase
    .from("rooms")
    .insert(rooms)
    .select("id, capacity");
  if (roomErr) throw new Error(`rooms insert: ${roomErr.message}`);
  if (!insertedRooms) throw new Error("rooms insert returned no data");
  console.log(`✓ Inserted ${insertedRooms.length} rooms`);

  // 3. Insert beds — one per capacity slot per room.
  const beds: Array<{
    tenant_id: string;
    room_id: string;
    bed_number: string;
    status: string;
  }> = [];
  for (const r of insertedRooms) {
    for (let i = 0; i < r.capacity; i++) {
      beds.push({
        tenant_id: tenant.id,
        room_id: r.id,
        bed_number: String(i + 1),
        status: "available",
      });
    }
  }
  console.log(`→ Inserting ${beds.length} beds…`);
  // Insert in chunks of 500 to stay under any payload limits.
  const insertedBeds: Array<{ id: string; room_id: string }> = [];
  for (let i = 0; i < beds.length; i += 500) {
    const chunk = beds.slice(i, i + 500);
    const { data, error } = await supabase
      .from("beds")
      .insert(chunk)
      .select("id, room_id");
    if (error) throw new Error(`beds insert chunk ${i}: ${error.message}`);
    if (data) insertedBeds.push(...data);
  }
  console.log(`✓ Inserted ${insertedBeds.length} beds`);

  // 4. Generate synthetic members. Fill ~96% of beds → 700 members.
  const targetMembers = Math.floor(insertedBeds.length * 0.96);
  console.log(`→ Inserting ${targetMembers} members…`);
  const members: Array<{
    tenant_id: string;
    name: string;
    phone: string;
    email: string;
    status: string;
    check_in_date: string;
  }> = [];

  // Spread check-in dates across the last 12 months so reports show variety.
  const now = new Date();
  for (let i = 0; i < targetMembers; i++) {
    const daysAgo = Math.floor(Math.random() * 365);
    const checkIn = new Date(now);
    checkIn.setDate(checkIn.getDate() - daysAgo);
    members.push({
      tenant_id: tenant.id,
      name: randomName(),
      phone: randomPhone(),
      email: `test.member.${i}.${Date.now()}@example.com`,
      status: "active",
      check_in_date: checkIn.toISOString().slice(0, 10),
    });
  }

  const insertedMembers: Array<{ id: string; check_in_date: string | null }> = [];
  for (let i = 0; i < members.length; i += 500) {
    const chunk = members.slice(i, i + 500);
    const { data, error } = await supabase
      .from("members")
      .insert(chunk)
      .select("id, check_in_date");
    if (error) throw new Error(`members insert chunk ${i}: ${error.message}`);
    if (data) insertedMembers.push(...data);
  }
  console.log(`✓ Inserted ${insertedMembers.length} members`);

  // 5. Create assignments. Pair each member with one bed, mark the bed
  // occupied. We do these in parallel batches but cap at 50 concurrent
  // requests so we don't overwhelm the connection pool.
  console.log(
    `→ Creating ${insertedMembers.length} bed assignments + flipping bed status…`,
  );
  const bedQueue = [...insertedBeds];
  const assignments: Array<{
    tenant_id: string;
    bed_id: string;
    member_id: string;
    move_in_date: string;
    is_active: boolean;
    billing_mode: string;
  }> = [];
  const bedIdsToOccupy: string[] = [];

  for (const m of insertedMembers) {
    const bed = bedQueue.shift();
    if (!bed) break;
    assignments.push({
      tenant_id: tenant.id,
      bed_id: bed.id,
      member_id: m.id,
      move_in_date: m.check_in_date ?? new Date().toISOString().slice(0, 10),
      is_active: true,
      billing_mode: "monthly",
    });
    bedIdsToOccupy.push(bed.id);
  }

  for (let i = 0; i < assignments.length; i += 500) {
    const chunk = assignments.slice(i, i + 500);
    const { error } = await supabase.from("assignments").insert(chunk);
    if (error) throw new Error(`assignments insert chunk ${i}: ${error.message}`);
  }
  console.log(`✓ Created ${assignments.length} assignments`);

  // Bulk-update bed status. We can't UPDATE … WHERE id IN (…thousands…)
  // in one shot via the JS client efficiently — chunk by 200.
  console.log(`→ Marking ${bedIdsToOccupy.length} beds as occupied…`);
  for (let i = 0; i < bedIdsToOccupy.length; i += 200) {
    const chunk = bedIdsToOccupy.slice(i, i + 200);
    const { error } = await supabase
      .from("beds")
      .update({ status: "occupied" })
      .in("id", chunk);
    if (error) throw new Error(`bed status update chunk ${i}: ${error.message}`);
  }

  console.log("\n✓ Seed complete!\n");
  console.log(`   Rooms:       ${insertedRooms.length}`);
  console.log(`   Beds:        ${insertedBeds.length}`);
  console.log(`   Members:     ${insertedMembers.length}`);
  console.log(`   Assignments: ${assignments.length}`);
  console.log(`   Tenant:      ${tenant.hostel_name} (${tenant.id})`);
  console.log("\nVisit /rooms and /members to see the load.\n");
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err.message ?? err);
  console.error(err);
  process.exit(1);
});
