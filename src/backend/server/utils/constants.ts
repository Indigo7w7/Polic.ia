import { users as usersTable } from '../../../database/db';

export const USER_FIELDS = {
  uid: usersTable.uid,
  name: usersTable.name,
  email: usersTable.email,
  photoURL: usersTable.photoURL,
  role: usersTable.role,
  school: usersTable.school,
  membership: usersTable.membership,
  status: usersTable.status,
  premiumExpiration: usersTable.premiumExpiration,
  lastActive: usersTable.lastActive,
  age: usersTable.age,
  city: usersTable.city,
  profileEdited: usersTable.profileEdited,
  honorPoints: usersTable.honorPoints,
  meritPoints: usersTable.meritPoints,
  currentStreak: usersTable.currentStreak,
  lastStreakUpdate: usersTable.lastStreakUpdate,
  createdAt: usersTable.createdAt,
};
