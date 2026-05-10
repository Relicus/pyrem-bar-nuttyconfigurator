-- T3_ECO_START
do
local unitDefs = UnitDefs or {}
local builders = {'armack', 'armaca', 'armacv', 'corack', 'coraca', 'coracv', 'legack', 'legaca', 'legacv'}

local function makeYardmap(footprintx, footprintz)
	if not footprintx or not footprintz then return nil end
	return string.rep('o', footprintx * footprintz)
end

local function ensureBuildOptions(list, name)
	if not unitDefs[name] then return end
	for i = 1, #list do
		local u = unitDefs[list[i]]
		if u then
			u.buildoptions = u.buildoptions or {}
			local found = false
			for j = 1, #u.buildoptions do
				if u.buildoptions[j] == name then found = true; break end
			end
			if not found then table.insert(u.buildoptions, name) end
		end
	end
end

local function mergeFootprint(name, footprintx, footprintz)
	local unitDef = unitDefs[name]
	if not unitDef then return end
	table.mergeInPlace(unitDef, {
		footprintx = footprintx,
		footprintz = footprintz,
		yardmap = makeYardmap(footprintx, footprintz)
	})
end

for _, defName in ipairs({'armmmkrt3', 'cormmkrt3', 'legadveconvt3'}) do
	mergeFootprint(defName, 6, 6)
end

for _, builderName in ipairs(builders) do
	local prefix = builderName:sub(1, 3)
	ensureBuildOptions({builderName}, prefix .. 'afust3')
	ensureBuildOptions({builderName}, prefix == 'leg' and 'legadveconvt3' or prefix .. 'mmkrt3')
end

for _, prefix in ipairs({'arm', 'cor', 'leg'}) do
	local groundBuilder = prefix .. 't3aide'
	local airBuilder = prefix .. 't3airaide'
	local ecoOptions = {
		prefix .. 'afust3',
		prefix == 'leg' and 'legadveconvt3' or prefix .. 'mmkrt3',
		prefix == 'leg' and 'legamstort3' or prefix .. 'uwadvmst3',
		prefix == 'leg' and 'legadvestoret3' or prefix .. 'advestoret3'
	}
	for _, optionName in ipairs(ecoOptions) do
		ensureBuildOptions({groundBuilder, airBuilder}, optionName)
	end
end

ensureBuildOptions({'legck'}, 'legdtf')

for _, defName in ipairs({'coruwadves', 'legadvestore'}) do
	mergeFootprint(defName, 4, 4)
end
end
-- T3_ECO_END
