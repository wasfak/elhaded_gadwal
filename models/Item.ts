import mongoose, { Schema, model, models } from "mongoose";

const ItemSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type ItemDoc = mongoose.InferSchemaType<typeof ItemSchema>;
export default models.Item || model("Item", ItemSchema);