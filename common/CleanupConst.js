/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

class CleanupConst {
    // no support for static contants, declare then after the class definition
}
CleanupConst.ALARM_NAME = "fhc-periodic-cleanup-alarm";
CleanupConst.INITIAL_DELAY_MINUTES = 2;
CleanupConst.PERIOD_MINUTES = 15;

CleanupConst.DEFAULT_DAYS_TO_KEEP = 90;
CleanupConst.DEFAULT_DO_CLEANUP = true;