import { PrismaClient } from '../generated/prisma/client/index.js';
const p = new PrismaClient();

const themes = await p.theme.findMany({ select: { id: true, name: true, isDefault: true } });
console.log('=== THEMES ===');
themes.forEach(t => console.log(t.id + ' | ' + t.name + ' | default=' + t.isDefault));

const lenses = await p.pitchLens.findMany({ select: { id: true, name: true, audienceType: true, pitchGoal: true, toneStyle: true, technicalLevel: true, industry: true, selectedFramework: true } });
console.log('\n=== EXISTING PITCH LENSES ===');
lenses.forEach(l => console.log(JSON.stringify(l)));

const users = await p.user.findMany({ select: { id: true, email: true } });
console.log('\n=== USERS ===');
users.forEach(u => console.log(u.id + ' | ' + u.email));

await p.$disconnect();
