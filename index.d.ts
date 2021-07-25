interface LevelObject {
	properties: {
		colors: {}[],
		gamemode: string,
		speed: number,
		font: number,
		songOffset: number,
		startMini: boolean,
		startDual: boolean,
		twoPlayer: boolean,
		fadeIn: boolean,
		fadeOut: boolean,
		alternateLine: number,
		count: number
	},
	objects: {}[]
}

declare function convert(data: string): LevelObject;

export = convert;