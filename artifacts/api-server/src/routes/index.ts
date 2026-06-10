import { Router, type IRouter } from "express";
import healthRouter from "./health";
import patientRouter from "./patient";
import codesRouter from "./codes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(patientRouter);
router.use(codesRouter);

export default router;
