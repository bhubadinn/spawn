#!/usr/bin/env node --experimental-strip-types --experimental-transform-types --no-warnings

import { createCli } from "../src/cli.ts";

const program = createCli();
program.parse();
