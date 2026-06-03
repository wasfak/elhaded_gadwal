import mongoose, { Schema, model, models } from "mongoose";

const BranchSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type BranchDoc = mongoose.InferSchemaType<typeof BranchSchema>;
export default models.Branch || model("Branch", BranchSchema);