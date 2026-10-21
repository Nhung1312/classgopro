import { strict as assert } from 'node:assert';
import { importReviewBankJson } from '../src/utils/reviewBankImport';
const bank = {type:'classgo_review_question_bank',sectionName:'Chương I',lessonName:'Bài 1',
  questions:[{question:'Tính 2 + 3',answer:'5',level:'basic'},
    {question:'Tính 2 + 3',answer:'5',level:'basic'},
    {question:'Giải x + 1 = 3',answer:'x = 2',level:'advanced'}]};
const result=importReviewBankJson(bank,[]);
assert.equal(result.items.length,2);assert.equal(result.skipped,1);
assert.equal(result.items[0].lesson,'Bài 1');
assert.equal(result.items[1].reviewLevel,'advanced');
assert.equal(importReviewBankJson(bank,result.items).items.length,0);
assert.equal(importReviewBankJson({type:'other',questions:bank.questions},[]).items.length,0);
console.log('Review JSON import checks passed');
