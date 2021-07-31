const zlib = require("zlib");
const props = require("./props/objectProperties.json");
const propProps = require("./props/initialProperties.json");
const colorProps = require("./props/colorProperties.json");

function convertKS38(kS38) {
	let splitKS38 = kS38.split("|").filter(x => x != "");
	let array = [];
	
	for (let value of splitKS38) {
		let valueSplit = value.split("_");
		let colorObj = {};

		for (let i = 0; i < valueSplit.length; i += 2) {
			let property = valueSplit[i];
			let theValue = valueSplit[i + 1];

			if (colorProps.values[valueSplit[i]]) {
				property = colorProps.values[valueSplit[i]][0];

				switch (colorProps.values[valueSplit[i]][1]) {
					case "list":
						theValue = colorProps[property + "s"][theValue];
						break;
					case "channel":
						theValue = colorProps.channels[theValue] ? colorProps.channels[theValue] : Number(theValue);
						break;
					case "number":
						theValue = Number(theValue);
						break;
					case "bool":
						theValue = theValue != "0";
						break;
					case "hsv":
						let hsv = theValue.split("a");
						hsv = {
							hue: Number(hsv[0]),
							saturation: Number(hsv[1]),
							brightness: Number(hsv[2]),
							saturationMode: Number(hsv[3]) == 1 ? "Additive" : "Multiplicative",
							brightnessMode: Number(hsv[4]) == 1 ? "Additive" : "Multiplicative"
						}
						theValue = hsv;
						break;
				}

				colorObj[property] = theValue;
			}
		}

		array.push(colorObj);
	}

	return array;
}

function parseObj(obj, splitter, nameArr) {
	let splitObj = obj.split(splitter);
	let parsedObj = {};

	for (let i = 0; i < splitObj.length; i += 2) {
		let property = splitObj[i];
		let value = splitObj[i + 1];

		if (nameArr.values[splitObj[i]]) {
			property = nameArr.values[splitObj[i]][0];
			
			switch (nameArr.values[splitObj[i]][1]) {
				case "list":
					value = nameArr[property + "s"][value];
					break;
				case "number":
					value = Number(value);
					break;
				case "channel":
					value = nameArr.channels[value] ? nameArr.channels[value] : Number(value);
					break;
				case "font":
					value = Number(value) + 1;
					break;
				case "bool":
					value = value != "0";
					break;
				case "string":
					value = Buffer.from(value, "base64").toString();
					break;
				case "array":
					value = value.split(".").map(x => Number(x));
					break;
				case "hsv":
					let hsv = value.split("a");
					hsv = {
						hue: Number(hsv[0]),
						saturation: Number(hsv[1]),
						brightness: Number(hsv[2]),
						saturationMode: Number(hsv[3]) == 1 ? "Additive" : "Multiplicative",
						brightnessMode: Number(hsv[4]) == 1 ? "Additive" : "Multiplicative"
					}
					value = hsv;
					break;
				case "extra-legacy-color":
					let colorInfo = property.split("-");

					if (colorInfo[2] == "blend")
						value = value != "0";
					else if (colorInfo[2] == "pcol")
						value = colorProps.pColors[value];
					else
						value = Number(value);
					break;
				case "legacy-color":
					let colorObj = value.split("_");
					let newColorObj = {};

					for (let j = 0; j < colorObj.length; j += 2) {
						let theProperty = colorObj[j];
						let theValue = colorObj[j + 1];

						if (colorProps.values[colorObj[j]]) {
							theProperty = colorProps.values[colorObj[j]][0];

							switch (colorProps.values[colorObj[j]][1]) {
								case "list":
									theValue = colorProps[theProperty + "s"][theValue];
									break;
								case "channel":
									theValue = colorProps.channels[theValue] ? colorProps.channels[theValue] : Number(theValue);
									break;
								case "number":
									theValue = Number(theValue);
									break;
								case "bool":
									theValue = theValue != "0";
									break;
								case "hsv":
									let hsv = theValue.split("a");
									hsv = {
										hue: Number(hsv[0]),
										saturation: Number(hsv[1]),
										brightness: Number(hsv[2]),
										saturationMode: Number(hsv[3]) == 1 ? "Additive" : "Multiplicative",
										brightnessMode: Number(hsv[4]) == 1 ? "Additive" : "Multiplicative"
									}
									theValue = hsv;
									break;
							}

							newColorObj[theProperty] = theValue;
						}
					}

					value = newColorObj;
					break;
				case "colors":
					value = convertKS38(value);
					break;
			}

			parsedObj[property] = value;
		}
	}

	return parsedObj;
}

function convertLegacy(obj) {
	let newObj = {
		colors: [],
		...obj
	}

	if (obj.colors) return obj;

	for (let prop of Object.keys(obj)) {
		if (prop.includes("legacy")) {
			let colorInfo = prop.split("-");
			let theObj = {};

			if (colorInfo[2]) {
				if (!newObj.colors.find(x => x.channel == colorInfo[1])) {
					theObj = {
						channel: isNaN(colorInfo[1]) ? colorInfo[1] : Number(colorInfo[1]),
						opacity: 1
					}
				} else
					theObj = newObj.colors.find(x => x.channel == colorInfo[1]);

				if (colorInfo[2] == "blend")
					theObj.blending = obj[prop];
				else if (colorInfo[2] == "pcol")
					theObj.pColor = obj[prop];
				else
					theObj[colorInfo[2]] = obj[prop];
			
				if (!newObj.colors.find(x => x.channel == colorInfo[1]))
					newObj.colors.push(theObj);
				else
					newObj.colors.splice(newObj.colors.findIndex(x => x.channel == colorInfo[1]), 1, theObj);
			} else {
				theObj = {
					...obj[prop],
					channel: isNaN(colorInfo[1]) ? colorInfo[1] : Number(colorInfo[1]),
					opacity: 1
				}

				newObj.colors.push(theObj);
			}

			delete newObj[prop];
		}
	}

	return newObj;
}

function convert(data) {
	if (!data.startsWith("kS")) data = zlib.unzipSync(Buffer.from(data, "base64")).toString();

	let properties = convertLegacy(parseObj(data.split(";")[0], ",", propProps));
	let array = data.split(";").slice(1).filter(x => x != "");

	let objects = [];

	for (let object of array)
		objects.push(parseObj(object, ",", props));

	properties.count = objects.length;
	
	return {
		properties,
		objects
	}
}

module.exports = convert;