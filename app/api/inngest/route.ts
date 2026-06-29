export const maxDuration = 300;

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";

import { auditFunction } from "@/lib/inngest/audit-function";
import { fixFunction } from "@/lib/inngest/fix-function";
import { auditRequestFunction } from "@/lib/inngest/audit-request-function";

export const { GET, POST, PUT } = serve(inngest, {
  functions: [
    auditFunction,
    fixFunction,
    auditRequestFunction,
  ],
});
