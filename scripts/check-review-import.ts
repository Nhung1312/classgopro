import { strict as assert } from 'node:assert';
import { importReviewBankJson } from '../src/utils/reviewBankImport';
const bank = {
  type:'classgo_review_question_bank',version:1,subject:'Toán',grade:'7',semester:'1',
  sectionName:'Chương I',lessonId:'toan7-1',lessonName:'Bài 1',
  questions:[
    {id:'a',question:'Tính 2 + 3',answer:'5',level:'basic'},
    {id:'b',question:'Tính 2 + 3',answer:'5',level:'basic'},
    {id:'c',question:'Giải x + 1 = 3',answer:'x = 2',level:'advanced'},
    {id:'c',question:'Câu trùng mã',answer:'?',level:'basic'},
    {id:'d',question:'Câu thiếu đáp án',answer:'',level:'basic'},
  ]
};
const target={className:'7A1',subject:'Toán'};
const result=importReviewBankJson(bank,[],target);
assert.equal(result.error,undefined);
assert.equal(result.items.length,2); assert.equal(result.skipped,3);
assert.equal(result.items[0].lesson,'Bài 1');
assert.equal(result.items[1].reviewLevel,'advanced');
assert.equal(importReviewBankJson(bank,result.items,target).items.length,0);
assert.match(importReviewBankJson({...bank,grade:'8'},[],target).error||'',/khối 8/);
assert.match(importReviewBankJson({...bank,subject:'Tiếng Anh'},[],target).error||'',/không khớp/);
assert.match(importReviewBankJson({...bank,version:2},[],target).error||'',/version 1/);
console.log('Review JSON import: schema, grade, subject and duplicate guards passed');
