-- T3 Eco

-- T3_ECO_START
do
local a,
b=UnitDefs or {}, {'armack','armaca','armacv','corack','coraca','coracv','legack','legaca','legacv'}

local function ensureBuildOption(builderName, optionName)
	local builder = a[builderName]
	local optionDef = optionName and a[optionName]
	if not builder or not optionDef then
		return
	end

	builder.buildoptions = builder.buildoptions or {}
	for i = 1, #builder.buildoptions do
		if builder.buildoptions[i] == optionName then
			return
		end
	end

	builder.buildoptions[#builder.buildoptions + 1] = optionName
end

for _,defName in pairs({'armmmkrt3','cormmkrt3','legadveconvt3'})do
	table.mergeInPlace(a[defName], {
		footprintx=6,
		footprintz=6
	})
end

for _,builderName in pairs(b)do
	local prefix=builderName:sub(1,3)
	ensureBuildOption(builderName,prefix..'afust3')
	ensureBuildOption(builderName,prefix=='leg'and'legadveconvt3'or prefix..'mmkrt3')
end

for _,prefix in pairs({'arm','cor','leg'})do
	local groundBuilder = prefix..'t3aide'
	local airBuilder = prefix..'t3airaide'
	local ecoOptions = {
		prefix..'afust3',
		prefix=='leg' and 'legadveconvt3' or prefix..'mmkrt3',
		prefix=='leg' and 'legamstort3' or prefix..'uwadvmst3',
		prefix=='leg' and 'legadvestoret3' or prefix..'advestoret3'
	}
	for _,optionName in ipairs(ecoOptions)do
		ensureBuildOption(groundBuilder, optionName)
		ensureBuildOption(airBuilder, optionName)
	end
end

ensureBuildOption('legck','legdtf')

for _,defName in pairs({'coruwadves','legadvestore'})do
	table.mergeInPlace(a[defName], {
		footprintx=4,
		footprintz=4
	})
end
end
-- T3_ECO_END
