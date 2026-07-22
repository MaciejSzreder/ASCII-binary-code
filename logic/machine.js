class Core{
	registers
	nest = 0;
	state = 1;/*
		1	execution
		2	comment
		3	false if
		4	false if comment
		5	repeat backtrack
		6	repeat backtrack comment
		7	service execution
	*/

	constructor(registers)
	{
		this.registers = new Int16Array(registers || 22);/*
			0	accumulator
			1	argument
			2	B
			3	instruction pointer
			4	IO port
			5	C
			6	data address
			7	E
			8	stack pointer
			9	F
			10	G
			11	X
			12	Z
			13	R
			14	H
			15	K
			16	L
			17	N
			18	U
			19	Q
			20	V
			20	W
		*/
	}

	fork()
	{
		let fork = new Core(this.registers);
		fork.registers[3]/*instruction pointer*/ = this.registers[0]/*accumulator*/;
		fork.state = this.state;
		return fork;
	}
}

export default class Machine{
	static makeTapeIterator(source)
	{
		if(typeof source === 'function'){
			return ()=>{
				const data = source();
				return data == null ? data : data&255;
			};
		}else if(Array.isArray(source)){
			return Machine.makeTapeIterator(()=>source?.shift());
		}else if(typeof source === 'string'){
			return Machine.makeTapeIterator([...source].map(char=>char.charCodeAt()))
		}
	}

	static makePortIterator(source)
	{
		if(typeof source === 'function'){
			return port=>{
				const data = source(port);
				return data == null ? data : data&255;
			}
		}else if(Array.isArray(source)){
			source = source.map(data=>Machine.makeTapeIterator(data));
			return Machine.makePortIterator(port=>(source[port]??(()=>{}))());
		}
	}

	static prepare(code, inputs=[], serviceCode)
	{
		let machine = new Machine;
		machine.load(code);

		let output = [];
		machine.outputs((port, data)=>{
			output[port]??=[];
			output[port].push(data);
		});

		inputs = Machine.makePortIterator(inputs);
		
		let outOfInput = false;
		machine.inputs((port)=>{
			const data = inputs(port);
			outOfInput = data == null;
			return data;
		});
		
		if(serviceCode){
			machine.serviceMode();
			machine.serviceInput(Machine.makeTapeIterator(serviceCode));
		}

		return {machine, output, outOfInput:()=>outOfInput};
	}

	static execute(code, steps, inputs=[], serviceCode)
	{
		let {machine, output, outOfInput} = Machine.prepare(code, inputs, serviceCode);

		for(let step=0; !(step>=steps || outOfInput() || machine.finished()); ++step){
			machine.step();
		}

		return {output, state: machine.state()};
	}
	
	static executeForInput(code, inputs=[], serviceCode)
	{
		let {machine, output, outOfInput} = Machine.prepare(code, inputs, serviceCode);

		do{
			machine.step();
		}while(!outOfInput() && !machine.finished());

		return {output, state: machine.state()};
	}

	static executeForSinglePass(code, inputs=[])
	{
		let {machine, output} = Machine.prepare(code, inputs);

		do{
			machine.step();
		}while(!machine.finished() && machine.cores[0].registers[3]/*instruction pointer*/ !== 0);

		return {output, state: machine.state()};
	}

	static instructions={
		0 /*NUL*/: (core)=>{
			core.registers[3]/*instruction pointer*/ = 0;
		},
		9 /*HT*/: (core)=>{
			++core.registers[3]/*instruction pointer*/;
		},
		10 /*LF*/: (core)=>{
			++core.registers[3]/*instruction pointer*/;
		},
		13 /*CR*/: (core)=>{
			++core.registers[3]/*instruction pointer*/;
		},
		32 /* */: (core)=>{
			++core.registers[3]/*instruction pointer*/;
		},
		33 /*!*/: (core)=>{
			core.registers[0]/*accumulator*/ = !core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		35 /*#*/: (core)=>{
			let accumulator = core.registers[0]/*accumulator*/;

			// 16bit set bit count
			let count = accumulator - ((accumulator >> 1) & 0o133333) - ((accumulator >> 2) & 0o111111);
			count = ((count + (count >> 3)) & 0o70707) % 63;

			core.registers[0]/*accumulator*/ = count;
			++core.registers[3]/*instruction pointer*/;
		},
		36 /*$*/: (core, machine)=>{
			machine.memory[(core.registers[6]/*data address*/ % machine.memory.length +  machine.memory.length) % machine.memory.length] = core.registers[0]/*accumulator*/
			++core.registers[3]/*instruction pointer*/;
		},
		37 /*%*/: (core)=>{
			core.registers[0]/*accumulator*/ = ((core.registers[0]/*accumulator*/%core.registers[1]/*argument*/)+core.registers[1]/*argument*/)%core.registers[1]/*argument*/;
			++core.registers[3]/*instruction pointer*/;
		},
		38 /*&*/: (core)=>{
			core.registers[0]/*accumulator*/ &= core.registers[1]/*argument*/;
			++core.registers[3]/*instruction pointer*/;
		},
		40 /*(*/: (core)=>{
			[core.registers[8]/*stack pointer*/, core.registers[6]/*data address*/] = [core.registers[6]/*data address*/, core.registers[8]/*stack pointer*/];
			++core.registers[3]/*instruction pointer*/;
		},
		41 /*)*/: (core, machine)=>{
			machine.memory[(--core.registers[6]/*data address*/ + machine.memory.length) % machine.memory.length] = core.registers[3]/*instruction pointer*/+1;
			core.registers[3]/*instruction pointer*/ = core.registers[0]/*accumulator*/;
		},
		42 /***/: (core)=>{
			core.registers[0]/*accumulator*/ *= core.registers[1]/*argument*/;
			++core.registers[3]/*instruction pointer*/;
		},
		43 /*+*/: (core)=>{
			core.registers[0]/*accumulator*/ += core.registers[1]/*argument*/;
			++core.registers[3]/*instruction pointer*/;
		},
		44 /*,*/: (core, machine)=>{
			--core.registers[6]/*data address*/;
			machine.memory[(core.registers[6]/*data address*/ % machine.memory.length +  machine.memory.length) % machine.memory.length] = core.registers[0]/*accumulator*/
			++core.registers[3]/*instruction pointer*/;
		},
		45 /*-*/: (core)=>{
			core.registers[0]/*accumulator*/ -= core.registers[1]/*argument*/;
			++core.registers[3]/*instruction pointer*/;
		},
		46 /*.*/: (core, machine)=>{
			machine.screen[core.registers[11]/*X*/][core.registers[12]/*Z*/] = [core.registers[13]/*R*/, core.registers[10]/*G*/, core.registers[2]/*B*/];
			++core.registers[3]/*instruction pointer*/;
		},
		47 /*/*/: (core)=>{
			if(core.registers[1]/*argument*/ === 0){
				if(core.registers[0]/*accumulator*/ === 0){
					core.registers[0]/*accumulator*/ = 0;
				}
				if(core.registers[0]/*accumulator*/ > 0){
					core.registers[0]/*accumulator*/ = 32767;
				}
				if(core.registers[0]/*accumulator*/ < 0){
					core.registers[0]/*accumulator*/ = -32768;
				}
			}else{
				core.registers[0]/*accumulator*/ = Math.min(core.registers[0]/*accumulator*//core.registers[1]/*argument*/, 32767);
			}
			++core.registers[3]/*instruction pointer*/;
		},
		48 /*0*/: (core)=>{
			core.registers[0]/*accumulator*/ *= 10;
			++core.registers[3]/*instruction pointer*/;
		},
		49 /*1*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 10 + 1;
			++core.registers[3]/*instruction pointer*/;
		},
		50 /*2*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 10 + 2;
			++core.registers[3]/*instruction pointer*/;
		},
		51 /*3*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 10 + 3;
			++core.registers[3]/*instruction pointer*/;
		},
		52 /*4*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 10 + 4;
			++core.registers[3]/*instruction pointer*/;
		},
		53 /*5*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 10 + 5;
			++core.registers[3]/*instruction pointer*/;
		},
		54 /*6*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 10 + 6;
			++core.registers[3]/*instruction pointer*/;
		},
		55 /*7*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 10 + 7;
			++core.registers[3]/*instruction pointer*/;
		},
		56 /*8*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 10 + 8;
			++core.registers[3]/*instruction pointer*/;
		},
		57 /*9*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 10 + 9;
			++core.registers[3]/*instruction pointer*/;
		},
		58 /*:*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ << 8 | core.registers[0]/*accumulator*/ >> 8
			++core.registers[3]/*instruction pointer*/;
		},
		59 /*;*/: (core)=>{
			core.state = 2/*comment*/;
			++core.registers[3]/*instruction pointer*/;
		},
		60 /*<*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ < core.registers[1]/*argument*/ ? 1 : 0;
			++core.registers[3]/*instruction pointer*/;
		},
		61 /*=*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ == core.registers[1]/*argument*/ ? 1 : 0;
			++core.registers[3]/*instruction pointer*/;
		},
		62 /*>*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ > core.registers[1]/*argument*/ ? 1 : 0;
			++core.registers[3]/*instruction pointer*/;
		},
		63 /*?*/: (core)=>{
			let min,max;
			if(core.registers[0]/*accumulator*/ < core.registers[1]/*argument*/){
				min = core.registers[0]/*accumulator*/;
				max = core.registers[1]/*argument*/;
			}else{
				min = core.registers[1]/*argument*/;
				max = core.registers[0]/*accumulator*/;
			}

			core.registers[0]/*accumulator*/ = Math.random() * (max - min + 1) + min;
			++core.registers[3]/*instruction pointer*/;
		},
		64 /*@*/: (core, machine)=>{
			core.registers[0]/*accumulator*/ = machine.memory[(core.registers[6]/*data address*/ % machine.memory.length +  machine.memory.length) % machine.memory.length];
			++core.registers[3]/*instruction pointer*/;
		},
		65 /*A*/: (core)=>{
			core.registers[1]/*argument*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		66 /*B*/: (core)=>{
			core.registers[2]/*B*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		67 /*C*/: (core)=>{
			core.registers[5]/*C*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		68 /*D*/: (core)=>{
			core.registers[6]/*data address*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		69 /*E*/: (core)=>{
			core.registers[7]/*E*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		70 /*F*/: (core)=>{
			core.registers[9]/*F*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		71 /*G*/: (core)=>{
			core.registers[10]/*G*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		72 /*H*/: (core)=>{
			core.registers[14]/*H*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		73 /*I*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 2 + 1;
			++core.registers[3]/*instruction pointer*/;
		},
		74 /*J*/: (core)=>{
			core.registers[3]/*instruction pointer*/ = core.registers[0]/*accumulator*/;
		},
		75 /*K*/: (core)=>{
			core.registers[15]/*K*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		76 /*L*/: (core)=>{
			core.registers[16]/*L*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		77 /*M*/: (core)=>{
			core.registers[0]/*accumulator*/ = Math.max(core.registers[0]/*accumulator*/, core.registers[1]/*argument*/);
			++core.registers[3]/*instruction pointer*/;
		},
		78 /*N*/: (core)=>{
			core.registers[17]/*N*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		79 /*O*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[0]/*accumulator*/ * 2;
			++core.registers[3]/*instruction pointer*/;
		},
		80 /*P*/: (core)=>{
			core.registers[4]/*io port*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		81 /*Q*/: (core)=>{
			core.registers[19]/*Q*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		82 /*R*/: (core)=>{
			core.registers[13]/*R*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		83 /*S*/: (core)=>{
			core.registers[0]/*accumulator*/ |= core.registers[0]/*accumulator*/ >= 0b10000000 ? 0b1111111110000000 : 0;
			++core.registers[3]/*instruction pointer*/;
		},
		85 /*U*/: (core)=>{
			core.registers[18]/*U*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		86 /*V*/: (core)=>{
			core.registers[20]/*V*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		87 /*W*/: (core)=>{
			core.registers[21]/*W*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		88 /*X*/: (core)=>{
			core.registers[11]/*X*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		89 /*Y*/: (core,machine)=>{
			machine.cores.push(core.fork());
			++core.registers[3]/*instruction pointer*/;
		},
		90 /*Z*/: (core)=>{
			core.registers[12]/*Z*/ = core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
		91 /*[*/: (core)=>{
			if(core.registers[0]/*accumulator*/ === 0){
				core.state = 3/*false if*/;
				core.nest = 1;
			}
			++core.registers[3]/*instruction pointer*/;
		},
		92 /*\*/: (core)=>{
			if(core.registers[0]/*accumulator*/ === 0){
				if(core.registers[1]/*argument*/ === 0){
					core.registers[0]/*accumulator*/ = 0;
				}
				if(core.registers[1]/*argument*/ > 0){
					core.registers[0]/*accumulator*/ = 32767;
				}
				if(core.registers[1]/*argument*/ < 0){
					core.registers[0]/*accumulator*/ = -32768;
				}
			}else{
				core.registers[0]/*accumulator*/ = Math.min(core.registers[1]/*argument*//core.registers[0]/*accumulator*/, 32767);
			}
			++core.registers[3]/*instruction pointer*/;
		},
		93 /*]*/: (core)=>{
			++core.registers[3]/*instruction pointer*/;
		},
		94 /*^*/: (core)=>{
			core.registers[0]/*accumulator*/ ^= core.registers[1]/*argument*/;
			++core.registers[3]/*instruction pointer*/;
		},
		95 /*_*/: (core)=>{
			core.registers[0]/*accumulator*/ = 0;
			++core.registers[3]/*instruction pointer*/;
		},
		96 /*`*/: (core, machine)=>{
			core.registers[0]/*accumulator*/ = machine.memory[(core.registers[6]/*data address*/++ % machine.memory.length +  machine.memory.length) % machine.memory.length];
			++core.registers[3]/*instruction pointer*/;
		},
		97 /*a*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[1]/*argument*/;
			++core.registers[3]/*instruction pointer*/;
		},
		98 /*b*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[2]/*B*/;
			++core.registers[3]/*instruction pointer*/;
		},
		99 /*c*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[5]/*C*/;
			++core.registers[3]/*instruction pointer*/;
		},
		100 /*d*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[6]/*data address*/;
			++core.registers[3]/*instruction pointer*/;
		},
		101 /*e*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[7]/*E*/;
			++core.registers[3]/*instruction pointer*/;
		},
		102 /*f*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[9]/*F*/;
			++core.registers[3]/*instruction pointer*/;
		},
		103 /*g*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[10]/*G*/;
			++core.registers[3]/*instruction pointer*/;
		},
		104 /*h*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[14]/*H*/;
			++core.registers[3]/*instruction pointer*/;
		},
		105 /*i*/: (core, machine)=>{
			let data = machine.inputsCallback(core.registers[4]/*io port*/);
			if(data != null){
				core.registers[0]/*accumulator*/ = data & 255;
				++core.registers[3]/*instruction pointer*/;
			}
		},
		106 /*j*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[3]/*instruction pointer*/;
			++core.registers[3]/*instruction pointer*/;
		},
		107 /*k*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[15]/*K*/;
			++core.registers[3]/*instruction pointer*/;
		},
		108 /*l*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[16]/*L*/;
			++core.registers[3]/*instruction pointer*/;
		},
		109 /*m*/: (core)=>{
			core.registers[0]/*accumulator*/ = Math.min(core.registers[0]/*accumulator*/, core.registers[1]/*argument*/);
			++core.registers[3]/*instruction pointer*/;
		},
		110 /*n*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[17]/*N*/;
			++core.registers[3]/*instruction pointer*/;
		},
		111 /*o*/: (core, machine)=>{
			machine.outputsCallback(core.registers[4]/*io port*/, core.registers[0]/*accumulator*/ & 255);
			++core.registers[3]/*instruction pointer*/;
		},
		112 /*p*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[4]/*io port*/;
			++core.registers[3]/*instruction pointer*/;
		},
		113 /*q*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[19]/*Q*/;
			++core.registers[3]/*instruction pointer*/;
		},
		114 /*r*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[13]/*R*/;
			++core.registers[3]/*instruction pointer*/;
		},
		115 /*s*/: (core)=>{
			core.registers[0]/*accumulator*/ = Math.round(Math.sin(core.registers[0]/*accumulator*//65534*Math.PI)*32767);
			++core.registers[3]/*instruction pointer*/;
		},
		117 /*u*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[18]/*U*/;
			++core.registers[3]/*instruction pointer*/;
		},
		118 /*v*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[20]/*V*/;
			++core.registers[3]/*instruction pointer*/;
		},
		119 /*w*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[21]/*W*/;
			++core.registers[3]/*instruction pointer*/;
		},
		120 /*x*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[11]/*X*/;
			++core.registers[3]/*instruction pointer*/;
		},
		121 /*y*/: (core,machine)=>{
			machine.cores[machine.core--] = machine.cores[machine.cores.length-1];
			--machine.cores.length;
			++core.registers[3]/*instruction pointer*/;
		},
		122 /*z*/: (core)=>{
			core.registers[0]/*accumulator*/ = core.registers[12]/*Z*/;
			++core.registers[3]/*instruction pointer*/;
		},
		123 /*{*/: (core)=>{
			++core.registers[3]/*instruction pointer*/;
		},
		124 /*|*/: (core)=>{
			core.registers[0]/*accumulator*/ |= core.registers[1]/*argument*/;
			++core.registers[3]/*instruction pointer*/;
		},
		125 /*}*/: (core)=>{
			if(core.registers[0]/*accumulator*/ !== 0){
				core.state = 5/*repeat backtrack*/
				core.nest = 1;
				--core.registers[3]/*instruction pointer*/;
				return;
			}
			++core.registers[3]/*instruction pointer*/;
		},
		126 /*~*/: (core)=>{
			core.registers[0]/*accumulator*/ = ~core.registers[0]/*accumulator*/;
			++core.registers[3]/*instruction pointer*/;
		},
	}

	core = 0;

	cores = [new Core];
	memory = new Uint8Array(1<<16);
	screen = Array.from({length: 100}, ()=>Array.from({length:100}, ()=>[0,0,0]));
	inputsCallback = ()=>{};
	outputsCallback = console.log;
	processID;
	serviceInputCallback = ()=>{};

	load(code)
	{
		this.memory.set([...code].map((char)=>char.charCodeAt()));
	}

	outputs(callback)
	{
		this.outputsCallback = callback;
	}

	inputs(callback)
	{
		this.inputsCallback = callback;
	}

	restart()
	{
		clearInterval(this.processID);
		this.processID = setInterval(()=>this.step());
	}

	serviceInput(callback)
	{
		this.serviceInputCallback = callback;
	}

	serviceMode(enable=true)
	{
		this.cores[0].state = enable ? 7/*service*/ : 1/*execution*/;
	}

	run(steps)
	{
		for(let step=0; step<steps; ++step){
			this.step();
		}
	}

	step(){
		let core = this.cores[this.core];
		let codebyte = this.memory[core.registers[3]/*instruction pointer*/ % this.memory.length];
		switch(core.state){
		case 1/*execution*/:
			let instruction = Machine.instructions[codebyte];
			if(!instruction){
				throw Error('Unknown instruction "' + String.fromCharCode(this.memory[core.registers[3]/*instruction pointer*/]) + '" (code ' + this.memory[core.registers[3]/*instruction pointer*/] + ') at address ' + core.registers[3]/*instruction pointer*/ + ' in ' + String.fromCharCode(...this.memory) + '.');
			}
			instruction(core, this);
			break;
		case 2/*comment*/:
			if(codebyte === 59/*;*/){
				core.state = 1/*execution*/;
			}
			++core.registers[3]/*instruction pointer*/;
			break;
		case 3/*false if*/:
			if(codebyte === 93/*]*/){
				--core.nest;
				if(core.nest === 0){
					core.state = 1/*execution*/;
				}
			}else if(codebyte === 91/*[*/){
				++core.nest;
			}else if(codebyte === 59/*;*/){
				core.state = 4/*false if comment*/
			}
			++core.registers[3]/*instruction pointer*/;
			break;
		case 4/*false if comment*/:
			if(codebyte === 10/*LF*/){
				core.state = 3/*false if*/;
			}
			++core.registers[3]/*instruction pointer*/;
			break;
		case 5/*repeat backtrack*/:
			if(codebyte === 123/*{*/){
				--core.nest;
				if(core.nest === 0){
					core.state = 1/*execution*/;
					++core.registers[3]/*instruction pointer*/;
					break;
				}
			}else if(codebyte === 125/*}*/){
				++core.nest;
			}else if(codebyte === 59/*;*/){
				core.state = 6/*repeat backtrack comment*/
			}
			--core.registers[3]/*instruction pointer*/;
			break;
		case 6/*repeat backtrack comment*/:
			if(codebyte === 59/*;*/){
				core.state = 5/*repeat backtrack*/;
			}
			--core.registers[3]/*instruction pointer*/;
			break;
		case 7/*service execution*/:{
			codebyte = this.serviceInputCallback();
			if(codebyte == 0){
				core.state = 1/*execution*/;
				break;
			}
			let instruction = Machine.instructions[codebyte];
			if(!instruction){
				throw Error('Unknown instruction "' + String.fromCharCode(this.memory[core.registers[3]/*instruction pointer*/]) + '" (code ' + this.memory[core.registers[3]/*instruction pointer*/] + ') at address ' + core.registers[3]/*instruction pointer*/ + ' in ' + String.fromCharCode(...this.memory) + '.');
			}
			instruction(core, this);
			break;
		}
		}
		this.core = (this.core + 1) % this.cores.length;
	}

	state()
	{
		return {
			'registers': this.cores.map((core)=>({
				'': core.registers[0]/*accumulator*/,
				A: core.registers[1]/*argument*/,
				B: core.registers[2]/*B*/,
				C: core.registers[5]/*C*/,
				D: core.registers[6]/*data address*/,
				E: core.registers[7]/*E*/,
				F: core.registers[9]/*F*/,
				G: core.registers[10]/*G*/,
				H: core.registers[14]/*H*/,
				J: core.registers[3]/*instruction pointer*/,
				K: core.registers[15]/*K*/,
				L: core.registers[16]/*L*/,
				N: core.registers[17]/*N*/,
				P: core.registers[4]/*port*/,
				Q: core.registers[19]/*Q*/,
				R: core.registers[13]/*R*/,
				U: core.registers[18]/*U*/,
				V: core.registers[20]/*V*/,
				W: core.registers[21]/*W*/,
				X: core.registers[11]/*X*/,
				Z: core.registers[12]/*Z*/,
				'(': core.registers[8]/*stack pointer*/
			})),
			'memory': this.memory,
			'screen': this.screen
		};
	}

	finished()
	{
		return this.cores.length===0;
	}

	image()
	{
		return this.screen;
	}
}