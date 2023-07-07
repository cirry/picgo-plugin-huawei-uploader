"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatePath = void 0;
exports.getDatePath = (isAutoArchive) => {
    if (!isAutoArchive)
        return '';
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `/${year}/${month}/${day}`;
};
