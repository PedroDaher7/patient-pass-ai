import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import patientRouter from "./patient.js";
import codesRouter from "./codes.js";
import summarizeRouter from "./summarize.js";
import aiPatientSummaryRouter from "./ai-patient-summary.js";
import aiNormalizeRouter from "./ai-normalize.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(patientRouter);
router.use(codesRouter);
router.use(summarizeRouter);
router.use(aiPatientSummaryRouter);
router.use(aiNormalizeRouter);

export default router;
