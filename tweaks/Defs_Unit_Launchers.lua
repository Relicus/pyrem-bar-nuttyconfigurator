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
            i18n_en_tooltip='Launches Titan, Thor & Ratte by Pyrem'
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
                    spawns_name='armbanth armthor armrattet4',
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

local function ensureBuildOption(builderName, optionName)
	local builder = UnitDefs[builderName]
	local optionDef = optionName and UnitDefs[optionName]
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

if UnitDefs.cormandot4 then
    for c,d in pairs(b)do
        local e=a..'_'..c;
        if UnitDefs[a]and not UnitDefs[e]then
            UnitDefs[e]=table.merge(
            UnitDefs[a],d)
            ensureBuildOption('cormandot4',e)
        end
    end
end
end
-- UNIT_LAUNCHERS_END
