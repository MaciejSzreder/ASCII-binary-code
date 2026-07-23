import { expect, config } from 'https://cdn.jsdelivr.net/npm/chai@5.1.1/+esm';
config.truncateThreshold = 0;

import Machine from './logic/machine.js';

function codeString(code)
{
	if(code[0]!=='\n'){// not multiline string
		return code;
	}
	return(
		code
		.replaceAll(code.match(/\n[ \t]*/)[0], '\n')    // remove indentation
		.slice(1)	                                    // remove first new line
		.replace(/\n$/,'')                              // remove last new line
	);
}

function map(object, f)
{
	return Object.fromEntries(Object.entries(object).map(f))
}

function filter(object, f)
{
	return Object.fromEntries(Object.entries(object).filter(f))
}

function testExecutionOutput(code, steps, input, expectedOutput)
{
	let out = Machine.execute(codeString(code), steps, input).output;

	expect(out).to.deep.equal(expectedOutput.map((port)=>port?.map((value)=>value & 255)))
}

function testExecutionOutputForInput(code, input, expectedOutput)
{
	let out = Machine.executeForInput(codeString(code), input).output;

	expect(out).to.deep.equal(expectedOutput.map((port)=>port?.map((value)=>value & 255)))
}

function testExecutionOutputForSinglePass(code, input, expectedOutput)
{
	let out = Machine.executeForSinglePass(codeString(code), input).output;

	expect(out).to.deep.equal(expectedOutput.map((port)=>port?.map((value)=>value & 255)))
}

function testExecutionRegistersState(code, steps, input, expectedRegistersState)
{
	let registers = Machine.execute(codeString(code), steps, input).state.registers;

	expect(registers).to.deep.equal(expectedRegistersState.map((expectedRegistersState, processor)=>({
		...map(registers[processor], ([register, value])=>[
			register,
			expectedRegistersState[register]==='any'
				? value
				: expectedRegistersState.others ?? value
		]),
		...filter(expectedRegistersState, ([register, value])=>register!=='others' && value!=='any')
	})));
}

function testExecutionScreen(code, steps, expectedScreenState)
{
	let screen = Machine.execute(codeString(code), steps, []).state.screen;

	expect(screen).to.deep.equal(
		screen.map((pixels, row)=>pixels.map((pixel, column)=>
			expectedScreenState[`${row},${column}`] ?? expectedScreenState.others ?? pixel
		)
	));
}

function testServiceExecutionOutput(code, serviceCode, steps, input, expectedOutput)
{
	let out = Machine.execute(codeString(code), steps, input, serviceCode).output;

	expect(out).to.deep.equal(expectedOutput.map((port)=>port?.map((value)=>value & 255)))
}

describe('IO', ()=>{
	it('o command outputs', ()=>{
		testExecutionOutputForSinglePass('o', [], [[0]]);
	});
	it('o command outputs accumulator value', ()=>{
		testExecutionOutputForSinglePass('5o', [], [[5]]);
	});
	it('i command does not output', ()=>{
		testExecutionOutputForSinglePass('i', [], []);
	});
	it('i loads input to accumulator', ()=>{
		testExecutionRegistersState('i', 1, [[42]], [{'':42}]);
	});
	it('io passes input to output', ()=>{
		testExecutionOutputForSinglePass('io', [[10]], [[10]]);
	});
	it('P register allows to change input port', ()=>{
		testExecutionOutputForInput('io_1PiA_Pao', [[0,2,4,6,8],[1,3,5,7,9]], [[0,1,2,3,4,5,6,7,8,9]]);
	});
	it('P register allows to change output port', ()=>{
		testExecutionOutputForInput('ioiA_1Pao_P', [[0,1,2,3,4,5,6,7,8,9]], [[0,2,4,6,8],[1,3,5,7,9]]);
	});
	it('. changes pixel pointed by X and Z registers to color pointed by R, G, B registers', ()=>{
		testExecutionScreen('1X_2Z_3R_4G_5B.', 15, {'1,2':[3,4,5], 'others':[0,0,0]});
	});
});

describe('jumps', ()=>{
	it('code end loops', ()=>{
		testExecutionOutputForInput('io', [[0, 1, 2, 3, 4]], [[0, 1, 2, 3, 4]]);
	});
	it('setting J register jumps', ()=>{
		testExecutionOutputForSinglePass('_11Jo1o1o1o_1o', [], [[1]])
	});
	it('[] ignores code for zeroed accumulator', ()=>{
		testExecutionOutputForSinglePass('[o]',[],[]);
	});
	it('[] executes code for not zeroed accumulator', ()=>{
		testExecutionOutputForSinglePass('1[o]',[],[[1]]);
	});
	it('comments in [] can contain ]', ()=>{
		testExecutionOutputForSinglePass('[o;o]o;o]',[],[]);
	});
	it('comments in [] can contain ]', ()=>{
		testExecutionOutputForSinglePass('1[o;o]o;o]',[],[[1, 1]]);
	});
	it('[] can be nested', ()=>{
		testExecutionOutputForSinglePass('[o[o]o]',[],[]);
	});
	it('[] can be nested', ()=>{
		testExecutionOutputForSinglePass('_[o_1[o]o]',[],[]);
	});
	it('[] can be nested', ()=>{
		testExecutionOutputForSinglePass('_1[o_[o]o]',[],[[1, 0]]);
	});
	it('[] can be nested', ()=>{
		testExecutionOutputForSinglePass('_1[o[o]o]',[],[[1, 1, 1]]);
	});
	it('{} repeats code for not zeroed accumulator', ()=>{
		testExecutionOutputForSinglePass('1A_3{o-}',[],[[3, 2, 1]]);
	});
	it('{} does not repeat code for zeroed accumulator', ()=>{
		testExecutionOutputForSinglePass('{o}',[],[[0]]);
	});
	it('{} can be nested', ()=>{
		testExecutionOutputForSinglePass('1A_3B{o_3{o-}b-B}',[],[[3, 3,2,1, 2, 3,2,1, 1, 3,2,1]]);
	});
	it('{} can be nested', ()=>{
		testExecutionOutputForSinglePass('1A_4B{o{_o}b-B}',[],[[4, 0, 3, 0, 2, 0, 1, 0]]);
	});
	it('{} can be nested', ()=>{
		testExecutionOutputForSinglePass('{o1A_4{o-}_}',[],[[0, 4, 3, 2, 1]]);
	});
	it('{} can be nested', ()=>{
		testExecutionOutputForSinglePass('{o{o}}',[],[[0, 0]]);
	});
	it('comments in {} can contain {', ()=>{
		testExecutionOutputForSinglePass('{o;o{o;o}',[],[[0, 0]]);
	});
	it('comments in {} can contain {', ()=>{
		testExecutionOutputForSinglePass('1A_3{o;o{o;o-}',[],[[3,3, 2,2, 1,1]]);
	});
	it('forking jumps', ()=>{
		testExecutionOutput('_11YjJo1o1o_1ojJ',99 , [], [[1]])
	});
	it('function call push return address', ()=>{
		testExecutionOutputForSinglePass('2)_`o`o', [], [[0,2]]);
	});
	it('function call jumps', ()=>{
		testExecutionOutputForSinglePass('4)jJ_1o', [], [[1]]);
	});
	it('y ends execution', ()=>{
		testExecutionOutputForSinglePass('4oy_5o', [], [[4]]);
	});
	it('y ends execution new cores', ()=>{
		testExecutionOutputForSinglePass('8YYYYYYY_4oy_5o', [], [[4,4,4,4,4,4,4,4]]);
	});
});

describe('registers', ()=>{
	it('register A allows for input swapping order',()=>{
		testExecutionOutputForInput('iAioao', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register A modifies only register A',()=>{
		testExecutionRegistersState('5A', 2, [], [{
			'':5,
			A:5,
			J:'any',
			others:0
		}]);
	});
	it('register B allows for input swapping order',()=>{
		testExecutionOutputForInput('iBiobo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register B modifies only register B',()=>{
		testExecutionRegistersState('5B', 2, [], [{
			'':5,
			B:5,
			J:'any',
			others:0
		}]);
	});
	it('register C allows for input swapping order',()=>{
		testExecutionOutputForInput('iCioco', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register C modifies only register C',()=>{
		testExecutionRegistersState('5C', 2, [], [{
			'':5,
			C:5,
			J:'any',
			others:0
		}]);
	});
	it('register D allows for input swapping order',()=>{
		testExecutionOutputForInput('iDiodo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register D modifies only register D',()=>{
		testExecutionRegistersState('5D', 2, [], [{
			'':5,
			D:5,
			J:'any',
			others:0
		}]);
	});
	it('register E allows for input swapping order',()=>{
		testExecutionOutputForInput('iEioeo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register E modifies only register E',()=>{
		testExecutionRegistersState('5E', 2, [], [{
			'':5,
			E:5,
			J:'any',
			others:0
		}]);
	});
	it('register F allows for input swapping order',()=>{
		testExecutionOutputForInput('iFiofo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register F modifies only register F',()=>{
		testExecutionRegistersState('5F', 2, [], [{
			'':5,
			F:5,
			J:'any',
			others:0
		}]);
	});
	it('register G allows for input swapping order',()=>{
		testExecutionOutputForInput('iGiogo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register G modifies only register G',()=>{
		testExecutionRegistersState('5G', 2, [], [{
			'':5,
			G:5,
			J:'any',
			others:0
		}]);
	});
	it('stack pointer register allows for input swapping order',()=>{
		testExecutionOutputForInput('iD(iDiodo(do', [[0, 1, 2, 3, 4, 5]], [[2, 1, 0, 5, 4, 3]]);
	});
	it('writing to stack pointer register modifies only stack pointer register',()=>{
		testExecutionRegistersState('5D(', 3, [], [{
			'':5,
			'(':5,
			J:'any',
			others:0
		}]);
	});
	it('writing to register P modifies only register P',()=>{
		testExecutionRegistersState('5P', 2, [], [{
			'':5,
			P:5,
			J:'any',
			others:0
		}]);
	});
	it('register R allows for input swapping order',()=>{
		testExecutionOutputForInput('iRioro', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register R modifies only register R',()=>{
		testExecutionRegistersState('5R', 2, [], [{
			'':5,
			R:5,
			J:'any',
			others:0
		}]);
	});
	it('register H allows for input swapping order',()=>{
		testExecutionOutputForInput('iHioho', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register H modifies only register H',()=>{
		testExecutionRegistersState('5H', 2, [], [{
			'':5,
			H:5,
			J:'any',
			others:0
		}]);
	});
	it('register K allows for input swapping order',()=>{
		testExecutionOutputForInput('iKioko', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register K modifies only register K',()=>{
		testExecutionRegistersState('5K', 2, [], [{
			'':5,
			K:5,
			J:'any',
			others:0
		}]);
	});
	it('register L allows for input swapping order',()=>{
		testExecutionOutputForInput('iLiolo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register L modifies only register L',()=>{
		testExecutionRegistersState('5L', 2, [], [{
			'':5,
			L:5,
			J:'any',
			others:0
		}]);
	});
	it('register NL allows for input swapping order',()=>{
		testExecutionOutputForInput('iNiono', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register N modifies only register N',()=>{
		testExecutionRegistersState('5N', 2, [], [{
			'':5,
			N:5,
			J:'any',
			others:0
		}]);
	});
	it('register U allows for input swapping order',()=>{
		testExecutionOutputForInput('iUiouo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register U modifies only register U',()=>{
		testExecutionRegistersState('5U', 2, [], [{
			'':5,
			U:5,
			J:'any',
			others:0
		}]);
	});
	it('register V allows for input swapping order',()=>{
		testExecutionOutputForInput('iViovo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register V modifies only register V',()=>{
		testExecutionRegistersState('5V', 2, [], [{
			'':5,
			V:5,
			J:'any',
			others:0
		}]);
	});
	it('register W allows for input swapping order',()=>{
		testExecutionOutputForInput('iWiowo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register W modifies only register W',()=>{
		testExecutionRegistersState('5W', 2, [], [{
			'':5,
			W:5,
			J:'any',
			others:0
		}]);
	});
	it('register Q allows for input swapping order',()=>{
		testExecutionOutputForInput('iQioqo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register Q modifies only register Q',()=>{
		testExecutionRegistersState('5Q', 2, [], [{
			'':5,
			Q:5,
			J:'any',
			others:0
		}]);
	});
	it('writing to register J modifies only register J',()=>{
		testExecutionRegistersState('5J', 2, [], [{
			'':5,
			J:5,
			others:0
		}]);
	});
	it('register J stores current instruction address',()=>{
		testExecutionOutputForSinglePass('     jo', [], [[5]]);
	});
	it('writing to register X modifies only register X',()=>{
		testExecutionRegistersState('5X', 2, [], [{
			'':5,
			X:5,
			J:'any',
			others:0
		}]);
	});
	it('register X allows for input swapping order',()=>{
		testExecutionOutputForInput('iXioxo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('writing to register Z modifies only register Z',()=>{
		testExecutionRegistersState('5Z', 2, [], [{
			'':5,
			Z:5,
			J:'any',
			others:0
		}]);
	});
	it('register Z allows for input swapping order',()=>{
		testExecutionOutputForInput('iZiozo', [[0, 1, 2, 3]], [[1, 0, 3, 2]]);
	});
	it('pass 1 through registers P, A, B, C, D, stack pointer, E, F, G', ()=>{
		testExecutionOutputForSinglePass('1P_pA_PaB_bC_cD(_(_dE_eF_fG_go', [], [[1]]);
	});
});
describe('memory', ()=>{
	it('@ reads code', ()=>{
		testExecutionOutputForSinglePass('@o',[], [[64]])
	});
	it('@ uses data address register', ()=>{
		testExecutionOutputForSinglePass('_6D@o;D;',[], [[68]])
	});
	it('$ can change code', ()=>{
		testExecutionOutputForSinglePass('7D_111$',[], [[111]])
	});
	it('@ reads data written by $', ()=>{
		testExecutionOutputForSinglePass('100D_11$_@o',[], [[11]])
	});
	it('@ and $ supports negative address', ()=>{
		testExecutionOutputForSinglePass('1A_-D$_@o',[], [[255]])
	});
	it(', decreases data address register', ()=>{
		testExecutionOutputForSinglePass(',do',[], [[-1]])
	});
	it(', default appends at memory end', ()=>{
		testExecutionOutputForSinglePass('10,_1A--D@o',[], [[10]])
	});
	it(', appends at data address', ()=>{
		testExecutionOutputForSinglePass('100D_10,@o',[], [[10]])
	});
	it('` pops value appended by ,', ()=>{
		testExecutionOutputForSinglePass('10,_`o',[], [[10]]);
	});
	it('` pops value pointed by data address register', ()=>{
		testExecutionOutputForSinglePass('5D`o;\x10;',[], [[0x10]]);
	});
	it('` increments data address register', ()=>{
		testExecutionOutputForSinglePass('4D`do',[], [[5]]);
	});
})

describe('arithmetic', ()=>{
	it('add one', ()=>{
		testExecutionOutputForInput('iA_1+o', [[0, 1, 2, 3, 4]], [[1, 2, 3, 4, 5]]);
	});
	it('subtraction zeroes', ()=>{
		testExecutionOutputForInput('iA-o', [[0, 1, 2, 3, 4]], [[0, 0, 0, 0, 0]]);
	})
	it('subtracting one', ()=>{
		testExecutionOutputForInput('_1Ai-o', [[0, 1, 2, 3, 4]], [[-1, 0, 1, 2, 3]]);
	})
	it('multiply by itself', ()=>{
		testExecutionOutputForInput('iA*o', [[0, 1, 2, 3, 4]], [[0, 1, 4, 9, 16]]);
	})
	it('multiply by 2', ()=>{
		testExecutionOutputForInput('_2Ai*o', [[0, 1, 2, 3, 4]], [[0, 2, 4, 6, 8]]);
	});
	it('self division ones', ()=>{
		testExecutionOutputForInput('iA/o', [[-3, -2, -1, 1, 2, 3]], [[1, 1, 1, 1, 1, 1]]);
	});
	it('0/0 is 0', ()=>{
		testExecutionOutputForSinglePass('/o', [], [[0]]);
	});
	it('>0/0 is greatest', ()=>{
		testExecutionOutputForInput('i/o', [[1, 2, 3]], [[32767, 32767, 32767]]);
	});
	it('<0/0 is smallest', ()=>{
		testExecutionOutputForInput('iS/o', [[-1, -2, -3]], [[-32768, -32768, -32768]]);
	});
	it('smallest/-1 is greatest', ()=>{
		testExecutionOutputForSinglePass('_1A_-A _32768/o:o', [], [[255,127]]);
	});
	it('division sign change', ()=>{
		testExecutionOutputForInput('1A--A{i/o}', [[-3, -2, -1, 0, 1, 2, 3]], [[3, 2, 1, 0, -1, -2, -3]]);
	});
	it('inverted self division ones', ()=>{
		testExecutionOutputForInput('iA\\o', [[-3, -2, -1, 1, 2, 3]], [[1, 1, 1, 1, 1, 1]]);
	});
	it('0\\0 is 0', ()=>{
		testExecutionOutputForSinglePass('\\o', [], [[0]]);
	});
	it('0\\>0 is greatest', ()=>{
		testExecutionOutputForInput('iA_\\o', [[1, 2, 3]], [[32767, 32767, 32767]]);
	});
	it('0\\<0 is smallest', ()=>{
		testExecutionOutputForInput('iSA_\\o', [[-1, -2, -3]], [[-32768, -32768, -32768]]);
	});
	it('smallest\\smallest is greatest', ()=>{
		testExecutionOutputForSinglePass('_1A_-B _32768A b\\o:o', [], [[255,127]]);
	});
	it('inverted division sign change', ()=>{
		testExecutionOutputForInput('1A--B{iAb\\o}', [[-3, -2, -1, 0, 1, 2, 3]], [[3, 2, 1, 0, -1, -2, -3]]);
	});
	it('self modulo zeroes', ()=>{
		testExecutionOutputForInput('iA%o', [[0, 1, 2, 3, 4]], [[0, 0, 0, 0, 0]]);
	})
	it('modulo by 2', ()=>{
		testExecutionOutputForInput('_2Ai%o', [[-4, -3, -2, -1, 0, 1, 2, 3, 4]], [[0, 1, 0, 1, 0, 1, 0, 1, 0]]);
	})
	it('modulo by -2', ()=>{
		testExecutionOutputForInput('_2A_-Ai%o', [[-4, -3, -2, -1, 0, 1, 2, 3, 4]], [[0, -1, 0, -1, 0, -1, 0, -1, 0]]);
	})
	it('modulo by 0', ()=>{
		testExecutionOutputForInput('i%o', [[-4, -3, -2, -1, 0, 1, 2, 3, 4]], [[0, 0, 0, 0, 0, 0, 0, 0, 0]]);
	})
	it('selects smaller', ()=>{
		testExecutionOutputForInput('iSAiSmo', [[0,1, -1,0, 2,1, 1,2, -1,-2, -2,-1, -1,1, 1,-1, 1,1, -1,-1]], [[0, -1, 1, 1, -2, -2, -1, -1, 1, -1]])
	})
	it('selects greater', ()=>{
		testExecutionOutputForInput('iSAiSMo', [[0,1, -1,0, 2,1, 1,2, -1,-2, -2,-1, -1,1, 1,-1, 1,1, -1,-1]], [[1, 0, 2, 2, -1, -1, 1, 1, 1, -1]])
	})
	it('greater than 0', ()=>{
		testExecutionOutputForInput('iS>o', [[1,0,-1,2,-2,3,-3]], [[1,0,0,1,0,1,0]]);
	});
	it('equal to 0', ()=>{
		testExecutionOutputForInput('iS=o', [[1,0,-1,2,-2,3,-3]], [[0,1,0,0,0,0,0]]);
	});
	it('less than 0', ()=>{
		testExecutionOutputForInput('iS<o', [[1,0,-1,2,-2,3,-3]], [[0,0,1,0,1,0,1]]);
	});
	it('greater than 1', ()=>{
		testExecutionOutputForInput('_1AiS>o', [[1,0,-1,2,-2,3,-3]], [[0,0,0,1,0,1,0]]);
	});
	it('equal to 1', ()=>{
		testExecutionOutputForInput('_1AiS=o', [[1,0,-1,2,-2,3,-3]], [[1,0,0,0,0,0,0]]);
	});
	it('less than 1', ()=>{
		testExecutionOutputForInput('_1AiS<o', [[1,0,-1,2,-2,3,-3]], [[0,1,1,0,1,0,1]]);
	});
	it('not equal to 0', ()=>{
		testExecutionOutputForInput('iS!o', [[1,0,-1,2,-2,3,-3]], [[0,1,0,0,0,0,0]]);
	});
	it('random numbers are greater than lower bound', ()=>{
		testExecutionOutputForSinglePass('32000B{ _100A0?C<[co] _1Ab-B}', [], []);
	})
	it('random numbers are less than upper bound', ()=>{
		testExecutionOutputForSinglePass('32000B{ _1000A_100?C>[co] _1Ab-B}', [], []);
	})
	it('random numbers can be equal to lower bound', ()=>{
		testExecutionOutputForSinglePass(' {_100A0?=!}', [], []);
	})
	it('random numbers can be equal to upper bound', ()=>{
		testExecutionOutputForSinglePass(' {_1000A_100?=!}', [], []);
	})
	it('random numbers can be each between lower and upper bound', ()=>{
		testExecutionOutputForSinglePass('100B{ {_500A_100?Ab=!} bA_1+B _500=!}', [], []);
	});
	it('sinus', ()=>{
		testExecutionOutputForInput('_128Ai*s/o', [[0/*0°*/, 255/*90°*/, 85/*30°*/, 128/*45°*/, 170/*60*/]], [[0, 255, 127, 181, 221]]);
	});
});

describe('bitwise', ()=>{
	it('not', ()=>{
		testExecutionOutputForInput('i~o',[[0b0, 0b1, 0b10101010, 0b11111111]], [[0b11111111, 0b11111110, 0b01010101, 0b0]]);
	});
	it('and', ()=>{
		testExecutionOutputForInput('iA_1Pi&A_Pao',[[0b0, 0b11111111, 0b10101001], [0b11111111, 0b0, 0b10011010]], [[0b0, 0b0, 0b10001000]])
	});
	it('number parity (and)', ()=>{
		testExecutionOutputForInput('iA_1&o',[[10, 21, 0, 1, 6, 8]], [[0, 1, 0, 1, 0, 0]])
	});
	it('or', ()=>{
		testExecutionOutputForInput('iA_1Pi|A_Pao',[[0b0, 0b11111111, 0b10101001], [0b11111111, 0b0, 0b10011010]], [[0b11111111, 0b11111111, 0b10111011]])
	});
	it('make odd', ()=>{
		testExecutionOutputForInput('iA_1|o',[[10, 21, 0, 1, 6, 8]], [[11, 21, 1, 1, 7, 9]])
	});
	it('xor', ()=>{
		testExecutionOutputForInput('iA_1Pi^A_Pao',[[0b0, 0b11111111, 0b10101001], [0b11111111, 0b0, 0b10011010]], [[0b11111111, 0b11111111, 0b00110011]])
	});
	it('parity bit', ()=>{
		testExecutionOutputForInput('iAOOOOB^AOO^AO^A_IOOOOOOO&A_<o',[[0b0, 0b1, 0b10, 0b100, 0b1000, 0b10000, 0b100000, 0b1000000, 0b10000000, 0b10101010, 0b10001001]], [[0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1]])
	});
	it('sign extension', ()=>{
		testExecutionOutputForInput('iSo', [[0, 1, 2, 127, 128, 129, 255, 254, 1278]], [[0, 1, 2, 127, -128, -127, -1, -2, -2]]);
	});
	it('popcount', ()=>{
		testExecutionOutputForInput('i#o', [[0b0, 0b1, 0b10, 0b11, 0b11111111, 0b10101010, 0b01010101]], [[0, 1, 1, 2, 8, 4, 4]]);
	});
	it('byte swap', ()=>{
		testExecutionOutputForInput('iAi:|o:o', [[0x12, 0x34, 0xAB, 0xCD, 0x00, 0xFF, 0xFF, 0x00, 0xBE, 0xEF]], [[0x12, 0x34, 0xAB, 0xCD, 0x00, 0xFF, 0xFF, 0x00, 0xBE, 0xEF]]);
	});
});

describe('integer literals', ()=>{
	it('decimal digits append', ()=>{
		testExecutionOutputForSinglePass('_123o', [], [[123]]);
		testExecutionOutputForSinglePass('214o', [], [[214]]);
		testExecutionOutputForSinglePass('156o', [], [[156]]);
		testExecutionOutputForSinglePass('178o', [], [[178]]);
		testExecutionOutputForSinglePass('190o', [], [[190]]);
	});
	it('binary digits append', ()=>{
		testExecutionOutputForSinglePass('IOIOIOIOo', [], [[0b10101010]]);
		testExecutionOutputForSinglePass('OIOIOIOIo', [], [[0b01010101]]);
		testExecutionOutputForSinglePass('IOIOIOIo', [], [[0b1010101]]);
	});
	it('_ clears', ()=>{
		testExecutionOutputForSinglePass('190_o', [], [[0]]);
	});
});

describe('formatting', ()=>{
	it('code can contain spaces', ()=>{
		testExecutionOutputForInput('i o', [[0, 1, 2, 3, 4]], [[0, 1, 2, 3, 4]])
	})
	it('code can contain tabulation', ()=>{
		testExecutionOutputForInput('i\to', [[0, 1, 2, 3, 4]], [[0, 1, 2, 3, 4]])
	})
	it('code can contain new line (LF)', ()=>{
		testExecutionOutputForInput('i\no', [[0, 1, 2, 3, 4]], [[0, 1, 2, 3, 4]])
	})
	it('code can contain new line (CR)', ()=>{
		testExecutionOutputForInput('i\ro', [[0, 1, 2, 3, 4]], [[0, 1, 2, 3, 4]])
	})
	it('; ignores commands', ()=>{
		testExecutionOutputForSinglePass('io;o', [[1]], [[1]])
	})
	it('new line (LF) exits comment mode', ()=>{
		testExecutionOutputForInput('i;A+;o', [[0, 1, 2, 3, 4]], [[0, 1, 2, 3, 4]])
	})
});

describe('service mode', ()=>{
	it('service mode executes code from service input',()=>{
		testServiceExecutionOutput('_1o', '_2o', 3, [], [[2]]);
	});
	it('NULL character starts execution mode',()=>{
		testServiceExecutionOutput('_1o', '_2o_0J\0', 10, [], [[2, 1]]);
	});
});

describe('TIS-100',()=>{
	it('Self-Test Diagnostic',()=>{
		testExecutionOutputForInput('io_1Pio_P', [[0, 1, 2, 3, 4],[5, 6, 7, 8, 9]], [[0, 1, 2, 3, 4],[5, 6, 7, 8, 9]]);
	})
	it('Self-Test Diagnostic',()=>{
		testExecutionOutputForInput('iopA=-P', [[0, 1, 2, 3, 4],[5, 6, 7, 8, 9]], [[0, 1, 2, 3, 4],[5, 6, 7, 8, 9]]);
	})
	it('Self-Test Diagnostic',()=>{
		testExecutionOutput('7Yio_2J_1Pio_10J', 1000, [[0, 1, 2],[5, 6, 7, 8, 9]], [[0, 1, 2],[5, 6, 7, 8, 9]]);
	})
	it('Signal Amplifier', ()=>{
		testExecutionOutputForInput('iA+o', [[0, 1, 2, 3, 4]], [[0, 2, 4, 6, 8]]);
	});
	it('Differential Converter',()=>{
		testExecutionOutputForInput('1PiA_Pi-oA_1P_-o_', [[1,2,3,4,5],[5,4,3,2,1]], [[-4,-2,0,2,4],[4,2,0,-2,-4]])
	});
	it('Signal Comparator', ()=>{
		testExecutionOutputForInput('iSA_<o_1P_=o_2P_>o_P', [[1,0,-1,2,-2,3,-3]], [[1,0,0,1,0,1,0],[0,1,0,0,0,0,0],[0,0,1,0,1,0,1]]);
	});
	it('Signal Multiplexer', ()=>{
		testExecutionOutputForInput(`
			_1PiSB; B=selector;
			<A_1-A; A=selector>=0;
			_Pi*P; P=(selector>=0)*first;
			_Ab>A_1-A; A=selector<=0;
			pB; B=(selector>=0)*first;
			_2Pi*A; A=(selector<=0)*second;
			_P; first output;
			b+o; (selector>=0)*first+(selector<=0)*second;
			`,
			[[2,2,2],[1,0,-1],[3,3,3]],
			[[2,5,3]]
		);
	});
	it('Sequence Generator', ()=>{
		testExecutionOutputForInput(`
			1PiA; A=first;
			_PiB; B=second;
			mo; output min(first,second);
			bMo; output max(first,second);
			_o; sequence end;
			`,
			[[10,40,50,60,90,100],[20,30,50,70,80,100]],
			[[10,20,0,30,40,0,50,50,0,60,70,0,80,90,0,100,100,0]]
		)
	});
	it('Sequence Counter',()=>{
		testExecutionOutputForInput(`
			_B_C; sum=0, count=0;
				iAb+B; sum+=input;
				_<Ac+C; count+=input>0;
			_23*D_1-A_98*Ad+J; if input>0;
			bo
			_1Pco
			_P
			`,
			[[1,2,3,4,5,0, 1,2,0, 1,0, 0, 77,34,32,98,45,76,0]],
			[[15, 3, 1, 0, 362], [5, 2, 1, 0, 6]]
		);
	});
	it('Signal Edge Detector', ()=>{
		testExecutionOutputForInput(`
			iC;      C=current;
			-A;      A= current - previous;
			_9<D;    D= 9 < current - previous;
			_-A_9<A; 9 < previous - current;
			d+o;     |previous - current| > 9;
			cA;      previous<-current;
			`,
			[[0, 5, 100, 10, 20, 10, 1, 10]],
			[[0, 0, 1, 1, 1, 1, 0, 0]]
		);
	});
	it('Input Handler', ()=>{
		testExecutionOutputForInput(`
			iOA;            A=first;
			_1Pi|OA;        A=first second;
			_2Pi|OA;        A=first second third;
			_3Pi|AC;        C=first second third fourth;
			b^DA;           D=current ^ previous;
			cB;             previous<-current;
			_IOOO=C;        C=(first changed)? 1 : 0;
			_IOOAd=OAc+C;   C+=(second changed)? 2 : 0;
			_IOAd=A_3*Ac+C; C+=(third changed)? 3 : 0;
			_IAd=OOAc+C;    C+=(fourth changed)? 4 : 0;
			_Pco
			`,[
				[0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
				[0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
				[0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
				[0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0]
			],[
				[0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0]
			]
		)
	});
	it('Signal Pattern Detector', ()=>{
		testExecutionOutputForInput(`
			i=A;     is match;
			bO|A;    append match;
			_III&BA; keep only 3 last matches;
			_III=o;  is full match;
			_A`,
			[[2, 0,0,0, 1, 2, 0, 3, 0,0, 4, 0,0,0,0,0,0, 1, 0,0,0]],
			[[0, 0,0,1, 0, 0, 0, 0, 0,0, 0, 0,0,1,1,1,1, 0, 0,0,1]]
		)
	});
	it('Sequence Peek Detector', ()=>{
		testExecutionOutputForInput(`
			_32767B; initialize minimum;
			_C;      initialize maximum;
			{iA[;    while read value is not 0;
				bmB
				cMC
			]}
			bo
			_1Pco
			_P
			`,
			[[10,0, 1,2,3,0, 3,2,1,0, 1,3,2,0, 3,3,3,0]],
			[[10, 1, 1, 1, 3], [10, 3, 3, 3, 3]]
		);
	});
	it('Sequence Reverser', ()=>{
		testExecutionOutputForInput(`
			_1A
			{iB[
				d-D
				b$
			]}
			d[{
				@o
				d+D
			}]
			_o
			`,
			[[1,2,3,4,0, 0, 1,0, 1,2,0, 1,2,3,4,5,6,7,8,9,0]],
			[[4,3,2,1,0, 0, 1,0, 2,1,0, 9,8,7,6,5,4,3,2,1,0]]
		)
	});
	it('Signal Multiplier', ()=>{
		testExecutionOutputForInput(`
			iA
			_1Pi
			*A
			_Pao
			`,
			[
				[0,   1,   2,  3,   4, 5],
				[200, 100, 11, 55,  0, 5]
			],[
				[0,  100,  22, 165, 0, 25]
			]
		);
	});
	it('Signal Window Filter', ()=>{
		testExecutionOutputForInput(`
			;window (youngest)B, C, D, E, A(oldest);
			eAdEcDbCiB;      window shift;
			_1Pb+Ac+Ad+Ae+o; sum of 5-wide window;
			_PbAc+Ad+o;      sum of 3-wide window;
			`,
			[
				[1, 1, 1, 1, 1, 0, 0, 0, 0, 100, 50,  25,  12,  6,   3,  1]
			],[
				[1, 2, 3, 3, 3, 2, 1, 0, 0, 100, 150, 175, 87,  43,  21, 10],
				[1, 2, 3, 4, 5, 4, 3, 2, 1, 100, 150, 175, 187, 193, 96, 47]
			]
		);
	});
	it('Signal Divider',()=>{
		testExecutionOutputForInput(`
			iB
			_1PiA
			b%o
			_P
			b/o
			`,
			[
				[0,   1, 2],
				[100, 2, 1]
			],[
				[0,   0, 2],
				[0,   1, 0]
			]
		);
	});
	it('Sequence Indexer', ()=>{
		testExecutionOutputForInput(`
			{i,}
			{
				_1P _1Ai+A--D
				_P @o
			}
			`,
			[[11, 22, 33, 44, 55, 66, 77, 88, 99, 0],[0, 1, 2, 3, 4, 5, 6, 7, 8]],
			[[11, 22, 33, 44, 55, 66, 77, 88, 99]]
		);
	});
	it('Sequence Sorter', ()=>{
		testExecutionOutputForInput(`
			{i,}\`
			dB; array size;
			[{
				\`A; initialize min;
				dE; initialize min index;
				[{
					\`C<[
						cA; update min;
						dE; update min index;
					]
					d
				}]
				ao
				bD\`C; last value;
				dB; shrink array;
				_1Ae-D; real min index;
				c$; remove min from list;
				bD
			}]
			o
			`,
			[[11,22,33,0,33,22,11,0,100,200,0,200,100,0,100,0,0,3,1,4,5,9,2,8,6,7,0]],
			[[11,22,33,0,11,22,33,0,100,200,0,100,200,0,100,0,0,1,2,3,4,5,6,7,8,9,0]]
		);
	});
});

describe('other', ()=>{
	it('fibonacci', ()=>{
		testExecutionOutput(`
			o1B
				b
				+Bo
				+Ao
			_5J
			`, 146,
			[],
			[[0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181]]
		)
	});
	it('negabinary to binary', ()=>{
		testExecutionOutputForInput(`
			iA
			_OIOIOIOI&B ;positive bits;
			_IOIOIOIO&A  ;negative bits;
			b-o         ;joins positive nad negative bits;
			`,
			[[0b1, 0b10, 0b11, 0b1111, 0b11111, 0b110001]],
			[[1, -2, -1, -5, 11, -15]]
		)
	})
})