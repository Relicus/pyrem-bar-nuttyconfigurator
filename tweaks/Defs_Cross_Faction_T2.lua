-- Cross Faction T2
-- Decoded from tweakdata.txt line 4

--Cross Faction Tax 70%
-- Authors: TetrisCo
-- docs.google.com/spreadsheets/d/1QSVsuAAMhBrhiZdTihVfSCwPzbbZWDLCtXWP23CU0ko
-- CROSS_FACTION_START
do
local unitDefs,taxMultiplier,tierTwoFactories,taxedDefs,language,suffix,labelSuffix=UnitDefs or{},1.7,{}, {},Json.decode(VFS.LoadFile('language/en/units.json')),'_taxed',' (Taxed)'

local function ensureBuildOption(builderName, optionName, optionSource)
	local builder = unitDefs[builderName]
	local optionDef = optionSource and optionSource[optionName] or unitDefs[optionName]
	if not builder or not optionDef or not optionName then
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

for unitName,def in pairs(unitDefs)do
	if def.customparams and def.customparams.subfolder and(def.customparams.subfolder:match'Fact'or def.customparams.subfolder:match'Lab')and def.customparams.techlevel==2 then
		local humanName=language and language.units.names[unitName]or unitName
		tierTwoFactories[unitName]=true
		taxedDefs[unitName..suffix]=table.merge(def,{
			energycost=def.energycost*taxMultiplier,
			icontype=unitName,
			metalcost=def.metalcost*taxMultiplier,
			name=humanName..labelSuffix,
			customparams={
				i18n_en_humanname=humanName..labelSuffix,
				i18n_en_tooltip=language and language.units.descriptions[unitName]or unitName
			}
		})
	end
end

for builderName,builder in pairs(unitDefs)do
	if builder.buildoptions then
		for _,optionName in pairs(builder.buildoptions)do
			if tierTwoFactories[optionName] then
				for _,factionPrefix in pairs{'arm','cor','leg'}do
					local taxedName=factionPrefix..optionName:sub(4)..suffix
					if optionName:sub(1,3)~=factionPrefix and taxedDefs[taxedName] then
						ensureBuildOption(builderName,taxedName,taxedDefs)
					end
				end
			end
		end
	end
end

table.mergeInPlace(unitDefs,taxedDefs)
end
-- CROSS_FACTION_END
