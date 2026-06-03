import mongoose, { Schema, model, models } from "mongoose";

const PhotoSchema = new Schema(
  { fullKey: { type: String, required: true } },
  { _id: false }
);

const SubmissionSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true }, // snapshot
    quantity: { type: Number, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    branchName: { type: String, required: true, trim: true }, // snapshot
    photos: { type: [PhotoSchema], required: true },
    createdBy: { type: String }, // Clerk user id later
    status: { type: String, enum: ["not_sent", "sent"], default: "not_sent" },
    statusUpdatedAt: { type: Date },
    statusUpdatedBy: { type: String }, // Clerk user later
  },
  { timestamps: true }
);

// indexes for the dashboard filters
SubmissionSchema.index({ createdAt: -1 });
SubmissionSchema.index({ code: 1 });
SubmissionSchema.index({ branchId: 1 });
SubmissionSchema.index({ status: 1 });

export type SubmissionDoc = mongoose.InferSchemaType<typeof SubmissionSchema>;
export default models.Submission || model("Submission", SubmissionSchema);