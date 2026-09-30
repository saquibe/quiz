import mongoose, { Schema, models, model } from "mongoose";

const CandidateSchema = new Schema({ name: { type: String, required: true }, registrationNumber: { type: String, required: true } }, { timestamps: true });
const QuestionSchema = new Schema({
  questionId: { type: String, required: true, unique: true }, question: { type: String, required: true },
  options: { type: [String], default: [] }, correctAnswer: { type: String, required: true },
  section: { type: Number, required: true }, image: { type: [String], default: [] }
}, { timestamps: true });
const ExamAttemptSchema = new Schema({
  candidate: { type: Schema.Types.ObjectId, ref: "Candidate", required: true },
  answers: { type: [{ questionId: String, value: String }], default: [] }, score: { type: Number, default: 0 },
  questionTimers: { type: [{ questionId: String, elapsedSeconds: { type: Number, default: 0 }, activeSince: Date }], default: [] },
  activeQuestionId: { type: String },
  startedAt: { type: Date, required: true }, completedAt: { type: Date },
  status: { type: String, enum: ["active", "completed"], default: "active" },
  currentSection: { type: Number, default: 1 }, sectionStartedAt: { type: Date, required: true }
}, { timestamps: true });

export const Candidate = models.Candidate || model("Candidate", CandidateSchema);
export const Question = models.Question || model("Question", QuestionSchema);

// Next.js keeps Mongoose models in memory across dev hot reloads. Recompile this
// model when its timer fields have changed so visit requests use the current schema.
const cachedExamAttempt = models.ExamAttempt;
const cachedQuestionTimerSchema = (cachedExamAttempt?.schema.path("questionTimers") as any)?.schema;
const examAttemptSchemaIsCurrent = Boolean(
  cachedExamAttempt?.schema.path("activeQuestionId") &&
  cachedQuestionTimerSchema?.path("elapsedSeconds") &&
  cachedQuestionTimerSchema?.path("activeSince")
);

if (cachedExamAttempt && !examAttemptSchemaIsCurrent) mongoose.deleteModel("ExamAttempt");
export const ExamAttempt: mongoose.Model<any> = examAttemptSchemaIsCurrent
  ? cachedExamAttempt as mongoose.Model<any>
  : model<any>("ExamAttempt", ExamAttemptSchema);
