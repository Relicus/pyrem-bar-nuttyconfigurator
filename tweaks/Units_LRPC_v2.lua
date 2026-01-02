-- LRPC Rebalance v2
-- LRPC_START
do
local UnitDefs = UnitDefs or {}

-- Armada LRPC (Big Bertha)
if UnitDefs.armbrtha then
    table.mergeInPlace(UnitDefs.armbrtha, {
        health = 13000,
        weapondefs = {
            ARMBRTHA_MAIN = {
                damage = {
                    commanders = 480,
                    default = 33000
                },
                areaofeffect = 60,
                energypershot = 8000,
                range = 2400,
                reloadtime = 9,
                turnrate = 20000
            }
        }
    })
end

-- Cortex LRPC (Intimidator)
if UnitDefs.corint then
    table.mergeInPlace(UnitDefs.corint, {
        health = 13000,
        weapondefs = {
            CORINT_MAIN = {
                damage = {
                    commanders = 480,
                    default = 85000
                },
                areaofeffect = 230,
                edgeeffectiveness = 0.6,
                energypershot = 15000,
                range = 2700,
                reloadtime = 18
            }
        }
    })
end

-- Legion LRPC
if UnitDefs.leglrpc then
    table.mergeInPlace(UnitDefs.leglrpc, {
        health = 13000,
        weapondefs = {
            LEGLRPC_MAIN = {
                damage = {
                    commanders = 480,
                    default = 4500
                },
                energypershot = 2000,
                range = 2000,
                reloadtime = 2,
                turnrate = 30000
            }
        }
    })
end
end
-- LRPC_END
