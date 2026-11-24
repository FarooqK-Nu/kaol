import { Router } from "express";
import { createJobHandler } from "./jobs.controller";

export const jobsRouter: Router = Router();

jobsRouter.post("/", createJobHandler);
