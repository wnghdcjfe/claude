import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  githubId: string;
  username: string;
  avatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
