/*
 * Copyright (c) 2017. Stephan Mahieu
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 */

class DbConst {
    // no support for static contants, declare then after the class definition
}
DbConst.DB_NAME = "FormHistoryControl";
DbConst.DB_VERSION = 1;
DbConst.DB_STORE_TEXT = 'text_history';
DbConst.DB_STORE_ELEM = 'elem_history';

DbConst.DB_TEXT_IDX_FIELD = 'by_fieldkey';
DbConst.DB_TEXT_IDX_NAME = 'by_name';
DbConst.DB_TEXT_IDX_LAST = 'by_last';
DbConst.DB_TEXT_IDX_HOST = 'by_host';
DbConst.DB_TEXT_IDX_HOST_NAME = "by_host_plus_name";

DbConst.DB_ELEM_IDX_FIELD = 'by_fieldkey';
DbConst.DB_ELEM_IDX_SAVED = 'by_saved';