#!/usr/bin/env tsx

import { createCli } from "../src/cli.ts";

const program = createCli();
program.parse();
