import { strict as assert } from 'node:assert';
import { convertExcelReviewRows, buildReviewBankJson } from '../src/utils/reviewBankExchange';
import { importReviewBankJson } from '../src/utils/reviewBankImport';
const rows=[
 {'Mức độ':'Cơ bản','Câu hỏi':'Tính 2+3','Đáp án':'5'},
 {'Mức độ':'Nâng cao','Câu hỏi':'Giải x+3=8','Đáp án':'x=5'},
 {'Mức độ':'Cơ bản','Câu hỏi':'Tính 2+3','Đáp án':'5'},
 {'Mức độ':'Ngoại lệ','Câu hỏi':'Khác','Đáp án':'Không'},
 {'Mức độ':'Cơ bản','Câu hỏi':'Không có đáp án'}
];
const result=convertExcelReviewRows(rows,{subject:'Toán',grade:'7',chapter:'Chương I',lesson:'Bài 1'});
assert.equal(result.items.length,2); assert.equal(result.skipped,3);
const json=buildReviewBankJson({questions:result.items,subject:'Toán',grade:'7',chapter:'Chương I',lesson:'Bài 1'});
assert.equal(json.version,1); assert.equal(json.questions.length,2);
assert.equal(importReviewBankJson(json,[],{className:'7A1',subject:'Toán'}).items.length,2);
assert.throws(()=>buildReviewBankJson({questions:result.items,subject:'Toán',grade:'8',chapter:'Không',lesson:'Bài 2'}));
console.log('Review Excel rows and JSON roundtrip passed');
