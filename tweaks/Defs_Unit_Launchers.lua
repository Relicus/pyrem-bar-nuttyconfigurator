-- Unit Launchers

--Meatballlunch Reloaded
-- UNIT_LAUNCHERS_START
do
local UnitDefs,
a=UnitDefs or {},'armbotrail'
local b= {
    armt3= {
        maxthisunit=20,
        footprintx=6,
        footprintz=6,
        customparams= {

            i18n_en_humanname='Armada T3 Launcher',
            i18n_en_tooltip='Launches Titan, Thor, Ratte & Tumbleweed by Pyrem'
        },
        weapondefs= {
            arm_botrail= {
                stockpiletime=8,
                range=7550,
                metalpershot=13000,
                energypershot=180000,
                reloadtime=2,
                customparams= {
                    stockpilelimit=50,
                    spawns_name='armbanth armthor armrattet4 armvader',
                    spawns_mode='random'
                }
            }
        }
    },
    cort3= {
        maxthisunit=20,
        footprintx=6,
        footprintz=6,
        customparams= {

            i18n_en_humanname='Cortex T3 Launcher',
            i18n_en_tooltip='Launches Tzar, Behemoth & Juggernaut by Pyrem'
        },
        weapondefs= {
            arm_botrail= {
                stockpiletime=8,
                range=7550,
                metalpershot=20000,
                energypershot=180000,
                reloadtime=2,
                customparams= {
                    stockpilelimit=50,
                    spawns_name='corjugg corkorg corgolt4',
                    spawns_mode='random'
                }
            }
        }
    },
    legt3= {
        maxthisunit=20,
        footprintx=6,
        footprintz=6,
        customparams= {

            i18n_en_humanname='Legion T3 Launcher',
            i18n_en_tooltip='Launches Sols (2 Types) by Pyrem'
        },
        weapondefs= {
            arm_botrail= {
                stockpiletime=8,
                range=7550,
                metalpershot=16000,
                energypershot=180000,
                reloadtime=2,
                customparams= {
                    stockpilelimit=50,
                    spawns_name='leegmech legeheatraymech legeheatraymech_old',
                    spawns_mode='random'
                }
            }
        }
    }
}

local function ensureBuildOptions(list, name)
	if not UnitDefs[name] then return end
	for i=1, #list do
		local u = UnitDefs[list[i]]
		if u then
			u.buildoptions = u.buildoptions or {}
			local found = false
			for j=1, #u.buildoptions do
				if u.buildoptions[j] == name then found = true; break end
			end
			if not found then table.insert(u.buildoptions, name) end
		end
	end
end

if UnitDefs.cormandot4 then
    for c,d in pairs(b)do
        local e=a..'_'..c;
        if UnitDefs[a]and not UnitDefs[e]then
            local function c_copy(t) local n={} for k,v in pairs(t) do n[k]=type(v)=='table' and c_copy(v) or v end return n end
            UnitDefs[e]=table.merge(
            c_copy(UnitDefs[a]),d)
            ensureBuildOptions({'cormandot4'}, e)
        end
    end
end
end
-- UNIT_LAUNCHERS_END
