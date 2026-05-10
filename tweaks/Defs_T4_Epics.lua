--Epic Ragnarok, Calamity, Gattling Gun, Bastion, Heat Ray & more
--Authors: Altwaal

-- RAGNAROK_START
do
local a,b=UnitDefs or{},table.merge
local function c_copy(t) local n={} for k,v in pairs(t) do n[k]=type(v)=='table' and c_copy(v) or v end return n end
a.epic_ragnarok=b(c_copy(a['armvulc']),{
  name='Epic Ragnarok',
  description='Ticking down to your opponent\'s deletion. Non-refundable.',
  buildtime=920000,
  maxthisunit=80,
  health=140000,
  footprintx=6,
  footprintz=6,
  metalcost=180000,
  energycost=2600000,
  energystorage = 18000,
  icontype="armvulc",
  customparams={
    i18n_en_humanname='Epic Ragnarok',
    i18n_en_tooltip='Ticking down to your opponent\'s deletion. Non-refundable.',
    techlevel=4
  },
  weapondefs={
    apocalypse_plasma_cannon={
      collidefriendly=0,
      collidefeature=0,
      avoidfeature=0,
      avoidfriendly=0,
      name='Apocalypse Plasma Cannon',
      weapontype='BeamLaser',
      rgbcolor='1.0 0.2 0.1',
      camerashake=0,
      reloadtime=1,
      accuracy=10,
      areaofeffect=160,
      range=3080,
      energypershot=42000,
      turret=true,
      soundstart='lrpcshot3',
      soundhit='rflrpcexplo',
      soundhitvolume=40,
      size=8,
      impulsefactor=1.3,
      weaponvelocity=3100,
      thickness=12,
      laserflaresize=8,
      texture3="largebeam",
      tilelength=150,
      tolerance=10000,
      beamtime=0.12,
      corethickness=0.4,
      explosiongenerator='custom:tachyonshot',
      craterboost=0.15,
      cratermult=0.15,
      edgeeffectiveness=0.25,
      impactonly=1,
      noselfdamage=true,
      soundtrigger=1,
      lightintensity=0.05,
      lightradius=60,
      damage={
        default=22000,
        shields=6000,
        subs=2657
      },
      allowNonBlockingAim=true
    }
  },
  weapons={
    [1]={
      def='apocalypse_plasma_cannon'
    }
  }
})
local builders_arm = { 'armaca', 'armack', 'armacsub', 'armacv', 'armt3airaide', 'armt3aide' }

local function ensureBuildOptions(list, name)
	if not a[name] then return end
	for i=1, #list do
		local u = a[list[i]]
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

local function removeBuildOption(list, name)
	for i=1, #list do
		local u = a[list[i]]
		if u and u.buildoptions then
			for j=#u.buildoptions, 1, -1 do
				if u.buildoptions[j] == name then table.remove(u.buildoptions, j) end
			end
		end
	end
end

removeBuildOption(builders_arm, 'armvulc')
ensureBuildOptions(builders_arm, 'epic_ragnarok')
end
-- RAGNAROK_END

-- CALAMITY_START
do
local a,b=UnitDefs or{},table.merge
local function c_copy(t) local n={} for k,v in pairs(t) do n[k]=type(v)=='table' and c_copy(v) or v end return n end
a.epic_calamity=b(c_copy(a['corbuzz']),{
  name='Epic Calamity',
  description='Makes heavy issues for everyone in a 3km radius.',
  maxthisunit=80,
  footprintx=6,
  footprintz=6,
  buildtime=920000,
  health=145000,
  metalcost=165000,
  energycost=2700000,
  energystorage = 18000,
  icontype="corbuzz",
  customparams={
    i18n_en_humanname='Epic Calamity',
    i18n_en_tooltip='Makes heavy issues for everyone in a 3km radius.',
    techlevel=4
  },
  weapondefs={
    cataclysm_plasma_howitzer={
      collidefriendly=0,
      collidefeature=0,
      avoidfeature=0,
      avoidfriendly=0,
      impactonly=1,
      name='Cataclysm Plasma Howitzer',
      weapontype='Cannon',
      rgbcolor='0.15 0.6 0.5',
      camerashake=0,
      reloadtime=0.5,
      accuracy=10,
      areaofeffect=220,
      range=3150,
      energypershot=22000,
      turret=true,
      soundstart='lrpcshot3',
      soundhit='rflrpcexplo',
      soundhitvolume=50,
      size=12,
      impulsefactor=2.0,
      weaponvelocity=2500,
      turnrate=20000,
      thickness=18,
      laserflaresize=8,
      texture3="largebeam",
      tilelength=200,
      tolerance=10000,
      explosiongenerator='custom:tachyonshot',
      craterboost=0.15,
      cratermult=0.15,
      edgeeffectiveness=0.35,
      lightintensity=0.05,
      lightradius=60,
      damage={
        default=9000,
        shields=5490,
        subs=2350
      },
      allowNonBlockingAim=true
    }
  },
  weapons={
    [1]={
      def='cataclysm_plasma_howitzer'
    }
  }
})
local builders_cor={'coraca','corack','coracsub','coracv','cort3airaide','cort3aide'}

local function ensureBuildOptions(list, name)
	if not a[name] then return end
	for i=1, #list do
		local u = a[list[i]]
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

local function removeBuildOption(list, name)
	for i=1, #list do
		local u = a[list[i]]
		if u and u.buildoptions then
			for j=#u.buildoptions, 1, -1 do
				if u.buildoptions[j] == name then table.remove(u.buildoptions, j) end
			end
		end
	end
end

removeBuildOption(builders_cor, 'corbuzz')
ensureBuildOptions(builders_cor, 'epic_calamity')
end
-- CALAMITY_END

-- STARFALL_START
do
local a,b=UnitDefs or{},table.merge
local function c_copy(t) local n={} for k,v in pairs(t) do n[k]=type(v)=='table' and c_copy(v) or v end return n end
a.epic_starfall=b(c_copy(a['legstarfall']),{
  name='Epic Starfall',
  description='Delivering unexpected packages from orbit. Signature not required.',
  buildtime=920000,
  health=145000,
  metalcost=180000,
  energycost=3400000,
  maxthisunit = 80,
  hightrajectory=0,
  collisionvolumescales='61 128 61',
  footprintx=6,
  footprintz=6,
  customparams={
    i18n_en_humanname='Epic Starfall',
    i18n_en_tooltip='Delivering unexpected packages from orbit. Signature not required.',
    techlevel=4,
    modelradius=150
  },
  weapondefs={
    epic_viper_sabot={
      areaofeffect = 120,
      avoidfeature = false,
      castshadow = true,
      cegtag = "missiletrailviper",
      craterareaofeffect = 0,
      craterboost = 0,
      cratermult = 0,
      edgeeffectiveness = 0.5,
      explosiongenerator = "custom:genericshellexplosion-medium-bomb",
      firestarter = 70,
      flighttime = 10.0,
      impulsefactor = 0.123,
      model = "cormissile3fast.s3o",
      name = "Epic Sabot Rocket Barrage",
      noselfdamage = true,
      range = 3150,
      reloadtime = 0.2,
      smokecolor = 0.8,
      smokeperiod = 10,
      smokesize = 10,
      smoketime = 33,
      smoketrail = true,
      smoketrailcastshadow = false,
      soundhit = "SabotHit",
      soundhitwet = "splshbig",
      soundstart = "SabotFire",
      startvelocity = 800,
      targetmoveerror = 0.2,
      texture1 = "null",
      texture2 = "railguntrail",
      tolerance = 8000,
      tracks = true,
      turnrate = 12000,
      turret = true,
      weaponacceleration = 600,
      weapontimer = 0.1,
      weapontype = "MissileLauncher",
      weaponvelocity = 1800,
      customparams = {
        exclude_preaim = true,
        overrange_distance = 840,
        projectile_destruction_method = "descend",
      },
      damage = {
        default = 4752,
        shields = 1500,
        subs = 330,
      },
    }
  },
  weapons={
    [1]={
      def='epic_viper_sabot',
      onlytargetcategory='SURFACE',
      fastautoretargeting=true
    }
  }
})
local builders_leg_starfall={'legaca','legack','legacsub','legacv','legt3airaide','legt3aide'}

local function ensureBuildOptions(list, name)
	if not a[name] then return end
	for i=1, #list do
		local u = a[list[i]]
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

local function removeBuildOption(list, name)
	for i=1, #list do
		local u = a[list[i]]
		if u and u.buildoptions then
			for j=#u.buildoptions, 1, -1 do
				if u.buildoptions[j] == name then table.remove(u.buildoptions, j) end
			end
		end
	end
end

removeBuildOption(builders_leg_starfall, 'legstarfall')
ensureBuildOptions(builders_leg_starfall, 'epic_starfall')
end
-- STARFALL_END

-- BASTION_START
do
local a,b=UnitDefs or{},table.merge
local function c_copy(t) local n={} for k,v in pairs(t) do n[k]=type(v)=='table' and c_copy(v) or v end return n end
a.epic_bastion=b(c_copy(a['legbastion']),{
  name='Epic Bastion',
  description='Warning: Looking directly at the beam may cause permanent envy.',
  buildtime=150000,
  footprintx=6,
  footprintz=6,
  health=70000,
  metalcost=26000,
  energycost=860000,
  energystorage = 6000,
  sightdistance=1200,
  radardistance=1740,
  paralyzemultiplier=0.4,
  nochasecategory='VTOL',
  customparams={
    i18n_en_humanname='Epic Bastion',
    i18n_en_tooltip='Warning: Looking directly at the beam may cause permanent envy.',
    techlevel=3
  },
  weapondefs={
    epic_lightning_claw={
      areaofeffect = 8,
      avoidfeature = false,
      beamttl = 1,
      burst = 10,
      burstrate = 0.03333,
      craterareaofeffect = 0,
      craterboost = 0,
      cratermult = 0,
      duration = 1,
      edgeeffectiveness = 0.15,
      explosiongenerator = "custom:genericshellexplosion-medium-lightning2",
      firestarter = 50,
      impactonly = 1,
      impulsefactor = 0,
      intensity = 24,
      name = "Midas Torrent",
      noselfdamage = true,
      range = 1000,
      reloadtime = 1,
      rgbcolor = "1.0 0.9 0.1",
      soundhit = "lashit",
      soundhitwet = "sizzle",
      soundstart = "lghthvy1",
      soundtrigger = true,
      thickness = 2,
      turret = true,
      weapontype = "LightningCannon",
      weaponvelocity = 450,
      customparams = {
        spark_ceg = "genericshellexplosion-splash-lightning",
        spark_forkdamage = "0.33",
        spark_maxunits = "5",
        spark_range = "60",
      },
      damage = {
        default = 446,
        vtol = 43,
      },
    }
  },
  weapons={
    [1]={
      def='epic_lightning_claw',
      fastautoretargeting=true,
      onlytargetcategory='SURFACE'
    }
  }
})
local builders_leg_bastion={'legaca','legack','legacsub','legacv','legt3airaide','legt3aide'}

local function ensureBuildOptions(list, name)
	if not a[name] then return end
	for i=1, #list do
		local u = a[list[i]]
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

for i=3,10 do
	builders_leg_bastion[#builders_leg_bastion+1]='legcomlvl'..i
end
ensureBuildOptions(builders_leg_bastion, 'epic_bastion')
end
-- BASTION_END

-- EPIC_ELYSIUM_START
do
local d,m=UnitDefs or{},table.merge
local e=d.leggatet3
if e then
	local function c(t)
		local n={}
		for k,v in pairs(t) do
			n[k]=type(v)=='table' and c(v) or v
		end
		return n
	end
	local function x(v,n)
		if v then
			return math.ceil(v*n)
		end
	end
	local u=c(e)
	u.name='Epic Elysium'
	u.description='"No" is a perfectly valid response to incoming fire.'
	u.buildtime=x(e.buildtime,1.7)
	u.health=x(e.health,2.5)
	u.metalcost=x(e.metalcost,1.7)
	u.energycost=x(e.energycost,1.7)
	u.energystorage=x(e.energystorage,1.25)
	u.footprintx=6
	u.footprintz=6
	u.icontype='leggatet3'

	local r=(e.weapondefs or{}).repulsor or{}
	local rep=c(r)
	rep.name='Epic Shield'
	rep.weapontype='Shield'

	local sh=c(r.shield or{})
	sh.power=x(sh.power,2.5)
	sh.powerregen=x(sh.powerregen,4.5)
	sh.powerregenenergy=x(sh.powerregenenergy,1.9)
	sh.radius=x(sh.radius,1.3)
	sh.startingpower=x(sh.startingpower,1.7)
	rep.shield=sh
	rep.range=x(rep.range,1.3)

	u.weapondefs={epic_shield=rep}
	u.weapons={{def='epic_shield'}}

	u.customparams=m(c(e.customparams or{}),{
		i18n_en_humanname='Epic Elysium',
		 i18n_en_tooltip='"No" is a perfectly valid response to incoming fire.',
		techlevel=4,
		shield_power=sh.power,
		shield_radius=sh.radius
	})

	d.epic_elysium=u
end

local builders_leg_elysium={'legaca','legack','legacsub','legacv','legt3aide','legt3airaide'}

local function ensureBuildOptions(list, name)
	if not d[name] then return end
	for i=1, #list do
		local u = d[list[i]]
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

for i=3,10 do
	table.insert(builders_leg_elysium,'legcomlvl'..i)
end
ensureBuildOptions(builders_leg_elysium, 'epic_elysium')
end
-- EPIC_ELYSIUM_END

-- FORTRESS_START

do
local a,b=UnitDefs or{},table.merge
local function c_copy(t) local n={} for k,v in pairs(t) do n[k]=type(v)=='table' and c_copy(v) or v end return n end
a.epic_fortress=b(c_copy(a['legapopupdef']),{
  name='Epic Fortress',
  description='Politely asking everyone to leave using high-velocity arguments.',
  buildtime=300000,
  health=60000,
  metalcost=25200,
  energycost=315000,
  sightdistance=1500,
  customparams={
    i18n_en_humanname='Epic Fortress',
    i18n_en_tooltip='Politely asking everyone to leave using high-velocity arguments.',
    techlevel=3,
    paralyzemultiplier=0.0
  },
  weapondefs={
    epic_riot_devastator={
      name='Riot Devastator',
      weapontype='Cannon',
      collidefriendly=0,
      collidefeature=0,
      avoidfeature=0,
      avoidfriendly=0,
      damage={
        default=4900
      },
      accuracy=10,
      areaofeffect=164,
      areaofeffect=220,
      edgeeffectiveness=0.50,
      range=1300,
      reloadtime=1.6,
      energypershot=2400,
      turret=true,
      weaponvelocity=900,
      camerashake=0,
      explosiongenerator='custom:genericshellexplosion-medium',
      rgbcolor='1.0 0.3 0.5',
      size=10,
      soundhitvolume=22,
      soundstartvolume=18.0,
      impulsefactor=3.2,
      craterboost=0.25,
      cratermult=0.25,
      noselfdamage=true,
      impactonly=true,
      burnblow=true,
      proximitypriority=5
    },
    epic_minigun={
      accuracy=2,
      areaofeffect=32,
      collidefriendly=0,
      collidefeature=0,
      avoidfeature=0,
      avoidfriendly=0,
      burst = 6,
			burstrate = 0.066,
      burnblow=false,
      craterareaofeffect=0,
      craterboost=0,
      cratermult=0,
      duration=0.05,
      edgeeffectiveness=0.85,
      explosiongenerator="custom:plasmahit-sparkonly",
      falloffrate=0.15,
      firestarter=5,
      impulsefactor=2.0,
      intensity=1.2,
      name="Rotary Cannons",
      noselfdamage=true,
      impactonly=true,
      ownerExpAccWeight=4.0,
      proximitypriority=6,
      range=1000,
      reloadtime=0.4,
      rgbcolor="1 0.4 0.6",
      soundhit="bimpact3",
      soundhitwet="splshbig",
      soundstart="mgun6heavy",
      soundstartvolume=6.5,
      soundtrigger=true,
      sprayangle=450,
      texture1="shot",
      texture2="empty",
      thickness=4.5,
      tolerance=3000,
      turret=true,
      weapontype="LaserCannon",
      weaponvelocity=1300,
      damage={
        default=60,
        vtol=60,
      }
    }
  },
  weapons={
    [1]={
      def='epic_riot_devastator',
      onlytargetcategory='SURFACE'
    },
    [2]={
      def='epic_minigun',
      onlytargetcategory='SURFACE'
    },
    [3]={
      def='epic_minigun',
      onlytargetcategory='SURFACE'
    }
  }
})
local builders_leg={'legaca','legack','legacsub','legacv','legt3airaide','legt3aide'}

local function ensureBuildOptions(list, name)
	if not a[name] then return end
	for i=1, #list do
		local u = a[list[i]]
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

for i=3,10 do
	builders_leg[#builders_leg+1]='legcomlvl'..i
end
ensureBuildOptions(builders_leg, 'epic_fortress')
end
-- FORTRESS_END

