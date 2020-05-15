var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var skilltable = require('./skillstats.json')
var diff_names = require('./difficulty_levels.json')
var wounds_template = require('./wounds_template.json')
var wounds_names = require('./wounds_names.json')
const fs = require('fs');
// Configure logger settings


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

function indexOfMin(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] < max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

function indexOfMiddle(arr){
    if (arr.length === 0) {
        return -1;
    }
    if ((arr[0] >= arr[1] && arr[0] <= arr[2]) || (arr[0] <= arr[1] && arr[0] >= arr[2])){
        return 0;
    }
    if ((arr[1] >= arr[0] && arr[1] <= arr[2]) || (arr[1] <= arr[0] && arr[1] >= arr[2])){
        return 1;
    }
    if ((arr[2] >= arr[1] && arr[2] <= arr[0]) || (arr[2] <= arr[1] && arr[2] >= arr[0])){
        return 2;
    }
}

storedHeroData = []

function findMatchingHero(id){

    for (var i = 0; i < storedHeroData.length; i++) {

        if(storedHeroData[i].discorduserid==id){
            return storedHeroData[i]
        }
    }
    return undefined

}

storedHeroData = []

function findMatchingHeroIndex(id){

    for (var i = 0; i < storedHeroData.length; i++) {

        if(storedHeroData[i].discorduserid==id){
            return i
        }
    }
    return -1

}

function getHeroWoundDifficulty(id){
    var heroStats = findMatchingHero(userID)
    sum_wound_percent = 0

    Object.keys(heroStats.tmpdata.rany).forEach(k => {
        var element = heroStats.tmpdata.rany[k]
        var anywounds = false
        for(var i = 0; i<4; i+=1){
            if(element.severity[i]!=0){
                element.severity[i].forEach(element2 => {
                    sum_wound_percent += element2
                });
            }
        }
    });

    return sum_wound_percent
}

function make_test(userID, skill_name, dice_number, difficulty_modifier, consider_wounds_difficulty, print_final, print_warnings){
    var heroStats = findMatchingHero(userID)
    var messageStr = ""

    if(heroStats == undefined){
        if(print_warnings==true) messageStr = ">>> Nie można znaleźć twojej postaci! Czy na pewno ją dodał(a/e)ś?"
    }
    else{
        var level = heroStats.data.skills[skill_name]
        if(level == undefined) level = 0
        else level = parseInt(level)

        var statName = skilltable[skill_name]


        if(statName==undefined){
            messageStr = ">>> >>> BZZZT! BZZZ! ERROR! Molochowe oprogramowanie nie rozpoznało tej zdolności!\nSprawdź, czy jest wpisana poprawnie."
            var toRet = {};
            toRet.messageStr += messageStr;
        }
        else{
        
        var stat = heroStats.data.stats[statName]
        messageStr = ">>> **" + heroStats.data.meta.Imię + "** wykonuje test na " + skill_name +" (poziom zdolności: " + level + ", poziom cechy " +statName +": " + stat + ")\n"
        
        var die1 = getRandomInt(1,20)
        var die2 = getRandomInt(1,20)
        var die3 = getRandomInt(1,20)

        var dices = []
        dices[0] = die1
        dices[1] = die2
        dices[2] = die3

        var maxdie = indexOfMax(dices)
        var mindie = indexOfMin(dices)
        var mediandie = indexOfMiddle(dices)


        var critSucc = 0
        var critFail = 0

        if(die1 == 1) critSucc += 1
        if(die2 == 1) critSucc += 1
        if(die3 == 1) critSucc += 1

        if(die1 == 20) critFail += 1
        if(die2 == 20) critFail += 1
        if(die3 == 20) critFail += 1

        messageStr += 'Rzut 3k20: ('
        messageStr += dices[mindie]
        messageStr += ',**'
        messageStr += dices[mediandie]
        messageStr += '**,~~'
        messageStr += dices[maxdie]
        messageStr += '~~)\n'

        var finaldie1 = dices[mindie]
        var finaldie2 = dices[mediandie]

        //reduce dice
        for(var i = 1; i<=level; i++){
            if(finaldie1<finaldie2){
                if(finaldie2!=1)finaldie2 -= 1
            }
            else {
                if(finaldie1!=1) finaldie1 -= 1
            }
        }
        
        if(level!=0)
            messageStr += "Wynik na kościach po zmniejszeniu ich zdolnością: (" +finaldie1 +","+finaldie2+")\n"
        else
            messageStr += "Zerowy poziom zdolności powoduje zwiększenie trudności testu o 1 poziom!\n"

        var result = Math.max(finaldie1, finaldie2)
        
        
        var finaldifficulty = -1

        if(stat+2 >= result) finaldifficulty = 0     
        if(stat >= result) finaldifficulty = 1   
        if(stat-2 >= result) finaldifficulty = 2
        if(stat-5 >= result) finaldifficulty = 3   
        if(stat-8 >= result) finaldifficulty = 4  
        if(stat-11 >= result) finaldifficulty = 5  
        if(stat-15 >= result) finaldifficulty = 6  
        if(stat-20 >= result) finaldifficulty = 7    
        if(stat-24 >= result) finaldifficulty = 8

        finaldifficulty += Math.floor(level/4)
        if(level>=4){
            messageStr += "Wysoki poziom zdolności zmniejsza trudność testu o " + Math.floor(level/4)  + "poziom!\n"
        }


        var changeInDiff = critSucc - critFail

        finaldifficulty += changeInDiff

        switch(changeInDiff){
            case 1:
                messageStr += 'Test ułatwiony o **1** poziom z powodu krytycznego sukcesu!\n'
            break;
            case 2:
                messageStr += 'Test ułatwiony o **2** poziomy z powodu krytycznych sukcesów!!!\n'
            break;
            case 3:
                messageStr += '**SZANSA JEDNA NA 8000!**\n'
            break;
            case -1:
                messageStr += 'Test utrudniony o **1** poziom z powodu krytycznej porażki!\n'
            break;
            case -2:
                messageStr += 'Test utrudniony o **2** poziomy z powodu krytycznych porażek!!!\n'
            break;
            case -3:
                messageStr += '**PECH JEDEN NA 8000!**\n'
            break;                    
        }


        if(print_final){
            messageStr += heroStats.data.meta.Imię
            if(finaldifficulty<0){
                messageStr += " nie zdaje testu o **żadnym poziomie trudności**."
            }
            else{
                messageStr += " zdaje test na poziomie **" + diff_names[finaldifficulty] + "** i prostszych!"
            }
        }

    }        
    return {messageStr,finaldifficulty}
}
}



logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
   // fs.openSync('./storedHeroes.json')
    var storedData = fs.readFileSync('./storedHeroes.json');
    storedHeroData = JSON.parse(storedData);
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '$') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
       
        //args = args.splice(1);
        switch(cmd) {
            case 'rzut1':
                var die1 = getRandomInt(1,20)
                var msgStr = '>>> '+ "<@"+userID+">\n" + 'wykonuje rzut 1k20: \n'
                msgStr += "wynik: **" + die1 + "**\n"

                bot.sendMessage({
                    to: channelID,
                    message: msgtext
                });
            break
            // !ping
            case 'rzut3':
                var die1 = getRandomInt(1,20)
                var die2 = getRandomInt(1,20)
                var die3 = getRandomInt(1,20)

                var dices = []
                dices[0] = die1
                dices[1] = die2
                dices[2] = die3

                var maxdie = indexOfMax(dices)
                var mindie = indexOfMin(dices)
                var mediandie = indexOfMiddle(dices)

                var critSucc = 0
                var critFail = 0

                if(die1 == 1) critSucc += 1
                if(die2 == 1) critSucc += 1
                if(die3 == 1) critSucc += 1

                if(die1 == 20) critFail += 1
                if(die2 == 20) critFail += 1
                if(die3 == 20) critFail += 1

                var msgtext = '>>> '+ "<@"+userID+">\n" + 'wykonuje rzut 3k20: ('
                msgtext += dices[mindie]
                msgtext += ',**'
                msgtext += dices[mediandie]
                msgtext += '**,~~'
                msgtext += dices[maxdie]
                msgtext += '~~)\n'
                var changeInDiff = critSucc - critFail
                switch(changeInDiff){
                    case 1:
                        msgtext += 'Test ułatwiony o **1** poziom z powodu krytycznego sukcesu!\n'
                    break;
                    case 2:
                        msgtext += 'Test ułatwiony o **2** poziomy z powodu krytycznych sukcesów!!!\n'
                    break;
                    case 3:
                        msgtext += 'SZANSA JEDNA NA 8000!\n'
                    break;
                    case -1:
                        msgtext += 'Test utrudniony o **1** poziom z powodu krytycznej porażki!\n'
                    break;
                    case -2:
                        msgtext += 'Test utrudniony o **2** poziomy z powodu krytycznych porażek!!!\n'
                    break;
                    case -3:
                        msgtext += 'PECH JEDEN NA 8000!\n'
                    break;                    
                }

                bot.sendMessage({
                    to: channelID,
                    message: msgtext
                });
            break

            case 'bohater':
                var cmd2 = message.substring(9)

                var messageStr = ""

                var heroIndex = findMatchingHeroIndex(userID)

                try{
                    var heroStat = JSON.parse(cmd2)

                    //check heroStat integrity
                    if(heroStat.meta==undefined) throw new Error("Wewnątrz postaci musi znajdować się pole \"meta\"!");
                    if(heroStat.meta.Imię == undefined) throw new Error("Wewnątrz meta musi znajdować się pole \"Imię\"!");
                    if(heroStat.meta.Pochodzenie == undefined) throw new Error("Wewnątrz meta musi znajdować się pole \"Pochodzenie\"!");
                    if(heroStat.meta.Profesja == undefined) throw new Error("Wewnątrz meta musi znajdować się pole \"Profesja\"!");
                    
                    if(heroStat.stats == undefined) throw new Error("Wewnątrz postaci musi znajdować się pole \"stats\"!");

                    if(heroStat.stats.Budowa == undefined) throw new Error("Wartość Budowy musi być liczbą!");    
                    if(isNaN(heroStat.stats.Budowa)) throw new Error("error parsing json: Budowa cannot be NaN!");   
                    if(heroStat.stats.Charakter == undefined) throw new Error("Wewnątrz stats musi znajdować się pole \"Charakter\"!");       
                    if(isNaN(heroStat.stats.Charakter)) throw new Error("Wartość Charakteru musi być liczbą!");    
                    if(heroStat.stats.Spryt == undefined) throw new Error("Wewnątrz stats musi znajdować się pole \"Spryt\"!");   
                    if(isNaN(heroStat.stats.Spryt)) throw new Error("Wartość Sprytu musi być liczbą!");    
                    if(heroStat.stats.Zręczność == undefined) throw new Error("Wewnątrz stats musi znajdować się pole \"Zręczność\"!");   
                    if(isNaN(heroStat.stats.Zręczność)) throw new Error("Wartość Zręczności musi być liczbą!");    
                    if(heroStat.stats.Percepcja == undefined) throw new Error("Wewnątrz stats musi znajdować się pole \"Percepcja\"!");   
                    if(isNaN(heroStat.stats.Percepcja)) throw new Error("Wartość Percepcji musi być liczbą!");   


                    if(heroStat.skills == undefined) throw new Error("Wewnątrz postaci musi znajdować się pole \"skills\"!"); 

                    Object.keys(heroStat.skills).forEach(key =>{
                        if(isNaN(heroStat.skills[key])) throw new Error("Zdolność " + key + " musi mieć wartość, która jest liczbą!")
                    })
                    
                    var hero = {}
                    hero.discorduserid = userID
                    hero.data = heroStat

                    hero.tmpdata = {}
                    hero.tmpdata.rany = {}

                    hero.tmpdata.rany = wounds_template;

                    if(heroIndex>-1){
                        messageStr += "Znaleziono bohatera należącego do tego użytkownika. Zostanie zastąpiony nowym."
                        storedHeroData[heroIndex] = hero
                    }
                    else{
                        storedHeroData.push(hero)
                    }

                    messageStr = ">>> Postać o imieniu ***"
                    messageStr += hero.data.meta.Imię
                    messageStr += "*** została przypisana do "
                    messageStr += "<@"
                    messageStr += hero.discorduserid
                    messageStr += ">"

                    fs.writeFileSync('./storedHeroes.json',JSON.stringify(storedHeroData))

                }
                catch(e){
                    messageStr = ">>> BZZZT! BZZZ! ERROR! Molochowe oprogramowanie miało problem z parsowaniem tej postaci!\n"
                    messageStr += "Opis błędu: `" + e + "`\n"
                }
                
                bot.sendMessage({
                    to: channelID,
                    message: messageStr
                });  
            break

            case 'test':
                var skill_name = message.substring(6)
                test_effect = make_test(userID,skill_name,3,0,true,true,true);
                bot.sendMessage({
                    to: channelID,
                    message: test_effect.messageStr
                }); 

            break

            case 'staty':
                var heroStats = findMatchingHero(userID)
                var messageStr = ">>> "
                if(heroStats == undefined){
                    messageStr = ">>> Nie można znaleźć twojej postaci! Czy na pewno ją dodał(a/e)ś?"
                }
                else{
                    messageStr += "**" +heroStats.data.meta.Imię + "**"
                    messageStr += ", bohater gracza "
                    messageStr += "<@"+userID+">\n"

                    messageStr += heroStats.data.meta.Profesja + " z miejsca znanego jako " + heroStats.data.meta.Pochodzenie +"\n"
                    messageStr += "**Współczynniki**:\n"
                    messageStr += "Zręczność: **" + heroStats.data.stats.Zręczność + "**, Percepcja: **" + heroStats.data.stats.Percepcja
                    messageStr += "** Charakter: **" + heroStats.data.stats.Charakter + "**, Spryt: **" + heroStats.data.stats.Spryt
                    messageStr += "**, Budowa: **" + heroStats.data.stats.Budowa + "**\n"

                    messageStr += "**Zdolności**:\n"

                    for(i in heroStats.data.skills){
                        messageStr += i + " " + heroStats.data.skills[i] + ", "
                    }

                    messageStr = messageStr.substring(0,messageStr.length-2)

                    messageStr += "\n**Rany:**\n"
                    
                    Object.keys(heroStats.tmpdata.rany).forEach(k => {
                        var element = heroStats.tmpdata.rany[k]
                        messageStr += "**" + element.name + ": **"
                        var anywounds = false
                        for(var i = 0; i<4; i+=1){
                            if(element.severity[i].length!=0){
                                messageStr += "" + wounds_names[i] + ": "
                                anywounds = true
                                element.severity[i].forEach(element1 => {
                                    messageStr += "" + element1 + ": "
                                });
                            }
                        }
                        if(anywounds==true){
                            messageStr = messageStr.substring(0,messageStr.length-2)
                        }
                        else{
                            messageStr += "brak ran"
                        }

                        messageStr += "; "
                    });

                    messageStr = messageStr.substring(0,messageStr.length-2)
                    
                }

                bot.sendMessage({
                    to: channelID,
                    message: messageStr
                }); 
            break;

            case 'rana':
                var messageStr = ">>> "
                var correct_check = true
                if(args.length < 3){
                    correct_check = false
                    msgStr += "Zbyt mało argumentów!\n"
                }
                else{
                    if(args[1] != 'g' && args[1] != 't' && args[1] != 'rp' && args[1] != 'rl' && args[1] != 'nl' && args[1] != 'np'){
                        correct_check = false
                        msgStr += "Pierwszy argument jest niepoprawny!\n"
                    }
                    if(args[2] != 'd' && args[2] != 'l' && args[2] != 'c' && args[2] != 'k'){
                        correct_check = false
                        msgStr += "Drugi argument jest niepoprawny!\n"
                    }
                }
                if(correct_check == false){
                    messageStr += "Jeśli nie wiesz, jak poprawnie użyć tej komendy, wpisz **$pomoc rana**!\n"
                }
                else{
                    var place = args[1]
                    var sev = args[2]
                    var sev_indx = 0
                    var diff_indx = 0
    
                    switch(sev){
                        case 'd':
                            sev_indx = 0
                            diff_indx = 5
                        break;
                        case 'l':
                            sev_indx = 1
                            diff_indx = 15
                        break;
                        case 'c':
                            sev_indx = 2
                            diff_indx = 30
                        break;
                        case 'k':
                            sev_indx = 3
                            diff_indx = 160
                        break;
                    }
    
    
    
                    var heroStats = findMatchingHero(userID)
    
    
                    if(heroStats == undefined){
                        messageStr = ">>> Nie można znaleźć twojej postaci! Czy na pewno ją dodał(a/e)ś?"
                    }
                    else{
                        if(sev_indx < 3){
                            pain_resistance_test = make_test(userID,"Odporność na ból",3,0,true,false,false)
                            
                            messageStr += pain_resistance_test.messageStr
    
                            var testsuccesfull = false
                            
                            switch(sev_indx){
                                case 0:
                                    if(pain_resistance_test.finaldifficulty >= 1){
                                        testsuccesfull = true
                                    }
                                break;
                                case 1:
                                    if(pain_resistance_test.finaldifficulty >= 2){
                                        testsuccesfull = true
                                    }
                                break;
                                case 2:
                                    if(pain_resistance_test.finaldifficulty >= 3){
                                        testsuccesfull = true
                                    }
                                break;
                            }
    
                            if(testsuccesfull==true){
                                messageStr += "**" +heroStats.data.meta.Imię + "** dzielnie wytrzymuje ból! Otrzymuje tylko połowę kary!\n"
                            }
                            else{
                                diff_indx *= 2
                                messageStr += "**" +heroStats.data.meta.Imię + "** płacze jak dziecko z powodu swojej rany i otrzymuje pełną karę!\n"
                            }
                        }
                        if(sev_indx==3){
                            messageStr += "**" +heroStats.data.meta.Imię + "** potrzebuje natychmiastowej pomocy medyka! Ale już!\n"
                        }
    
                        heroStats.tmpdata.rany[place].severity[sev_indx].push(diff_indx)
    
                        messageStr += "\n**Obecne rany:**\n"
    
                        sum_wound_percent = 0
                        
                        Object.keys(heroStats.tmpdata.rany).forEach(k => {
                            var element = heroStats.tmpdata.rany[k]
                            messageStr += "**" + element.name + ": **"
                            var anywounds = false
                            for(var i = 0; i<4; i+=1){
                                if(element.severity[i]!=0){
                                    anywounds = true
                                    messageStr += "" + wounds_names[i] + ": " + element.severity[i] + ", "
                                    element.severity[i].forEach(element2 => {
                                        sum_wound_percent += element2
                                    });
                                }
                            }
                            if(anywounds==true){
                                messageStr = messageStr.substring(0,messageStr.length-2)
                            }
                            else{
                                messageStr += "brak ran"
                            }
    
                            messageStr += "; "
                        });
                        messageStr+="\nCałkowita kara procentowa z ran: " + sum_wound_percent;
                        
                    }
    
                }
                

                bot.sendMessage({
                    to: channelID,
                    message: messageStr
                }); 

            break;

            case 'leczenie':
                var messageStr = ">>> "
                var correct_check = true
                if(args.length < 3){
                    correct_check = false
                    msgStr += "Zbyt mało argumentów!\n"
                }
                else{
                    if(args[1] != 'g' && args[1] != 't' && args[1] != 'rp' && args[1] != 'rl' && args[1] != 'nl' && args[1] != 'np' && args[1]!='w'){
                        correct_check = false
                        msgStr += "Pierwszy argument jest niepoprawny!\n"
                    }
                    if(isNaN(args[2])){
                        correct_check = false
                        msgStr += "Drugi argument jest niepoprawny!\n"
                    }
                }
                if(correct_check == false){
                    messageStr += "Jeśli nie wiesz, jak poprawnie użyć tej komendy, wpisz **$pomoc leczenie**!\n"
                }
                else{
                    var heal_place = args[1]
                    var heal_percent = args[2]

                    var heroStats = findMatchingHero(userID)
                    var messageStr = ">>> "

                    var sum_improved = 0
                    var sum_healed = 0
                    
                    if(heroStats == undefined){
                        messageStr = ">>> Nie można znaleźć twojej postaci! Czy na pewno ją dodał(a/e)ś?"
                    }
                    else{

                        messageStr += ""

                    //console.log(heal_place)
                    if(heal_place=='w'){
                        Object.keys(heroStats.tmpdata.rany).forEach(place => {
                            Object.keys(heroStats.tmpdata.rany[place].severity).forEach(sev =>{
                                var tmptable = []
                                Object.keys(heroStats.tmpdata.rany[place].severity[sev]).forEach(w_key =>{
                                    var element = heroStats.tmpdata.rany[place].severity[sev][w_key]
                                    element -= heal_percent
                                    sum_improved += 1
                                    if(element > 0) tmptable.push(element)
                                    else sum_healed += 1
                                    console.log(tmptable)
                                })
                                heroStats.tmpdata.rany[place].severity[sev] = tmptable
                            })
                        });
                    }
                    else{
                        Object.keys(heroStats.tmpdata.rany[heal_place].severity).forEach(sev =>{
                            var tmptable = []
                            Object.keys(heroStats.tmpdata.rany[heal_place].severity[sev]).forEach(w_key =>{
                                var element = heroStats.tmpdata.rany[heal_place].severity[sev][w_key]
                                element -= heal_percent
                                sum_improved += 1
                                if(element > 0) tmptable.push(element)
                                else sum_healed += 1
                                console.log(tmptable)
                            })
                            heroStats.tmpdata.rany[heal_place].severity[sev] = tmptable
                        })

                    }
                    
                    messageStr += "**" +heroStats.data.meta.Imię + "** leczy się z ran. **"
                    if(sum_improved == 1){
                        messageStr += "1 rana** uległa poprawieniu o **"
                    }
                    else{
                        if(sum_improved % 10 == 2 || sum_improved % 10 == 3 || sum_improved % 10 == 4){
                            messageStr += sum_improved + " rany** uległy poprawieniu o **"
                        }
                        else{
                            messageStr += sum_improved + " ran** uległo poprawieniu o **"
                        }
                    }
                    messageStr += heal_percent + "%**. **"
                    
                    if(sum_healed == 1){
                        messageStr += "1** rana uległa całkowitemu wyzdrowieniu."
                    }
                    else{
                        if(sum_healed % 10 == 2 || sum_healed % 10 == 3 || sum_healed % 10 == 4){
                            messageStr += sum_healed + "** rany uległy całkowitemu wyzdrowieniu."
                        }
                        else{
                            messageStr += sum_healed + "** ran uległo całkowitemu wyzdrowieniu."
                        }
                    }


                        messageStr += "\n**Obecne rany:**\n"

                        sum_wound_percent = 0
                        
                        Object.keys(heroStats.tmpdata.rany).forEach(k => {
                            var element = heroStats.tmpdata.rany[k]
                            messageStr += "**" + element.name + ": **"
                            var anywounds = false
                            for(var i = 0; i<4; i+=1){
                                if(element.severity[i]!=0){
                                    anywounds = true
                                    messageStr += "" + wounds_names[i] + ": " + element.severity[i] + ", "
                                    element.severity[i].forEach(element2 => {
                                        sum_wound_percent += element2
                                    });
                                }
                            }
                            if(anywounds==true){
                                messageStr = messageStr.substring(0,messageStr.length-2)
                            }
                            else{
                                messageStr += "brak ran"
                            }

                            messageStr += "; "
                        });
                        messageStr+="\nCałkowita kara procentowa z ran: " + sum_wound_percent;
                        
                    }
                }

                bot.sendMessage({
                    to: channelID,
                    message: messageStr
                }); 


            break;

            case 'rrana':
                var messageStr = ">>> "
                var correct_check = true
                if(args.length < 4){
                    correct_check = false
                    msgStr += "Zbyt mało argumentów!\n"
                }
                else{
                    if(args[1] != 'g' && args[1] != 't' && args[1] != 'rp' && args[1] != 'rl' && args[1] != 'nl' && args[1] != 'np'){
                        correct_check = false
                        msgStr += "Pierwszy argument jest niepoprawny!\n"
                    }
                    if(args[2] != 'd' && args[2] != 'l' && args[2] != 'c' && args[2] != 'k'){
                        correct_check = false
                        msgStr += "Drugi argument jest niepoprawny!\n"
                    }
                    if(isNaN(args[3])){
                        correct_check = false
                        msgStr += "Trzeci argument jest niepoprawny!\n"
                    }
                }
                if(correct_check == false){
                    messageStr += "Jeśli nie wiesz, jak poprawnie użyć tej komendy, wpisz **$pomoc rrana**!\n"
                }
                else{
                    var place = args[1]
                    var sev_indx = args[2]
                    var percent = args[3]
    
                    var heroStats = findMatchingHero(userID)
                    var messageStr = ">>> "
    
                    var sum_improved = 0
                    var sum_healed = 0
                    
                    if(heroStats == undefined){
                        messageStr = ">>> Nie można znaleźć twojej postaci! Czy na pewno ją dodał(a/e)ś?"
                    }
                    else{
    
                        messageStr += "Dodawanie rany postaci o imieniu " + "**" +heroStats.data.meta.Imię + "**"
                        heroStats.tmpdata.rany[place].severity[sev_indx].push(percent)
    
    
                        messageStr += "\n**Obecne rany:**\n"
    
                        sum_wound_percent = 0
                        
                        Object.keys(heroStats.tmpdata.rany).forEach(k => {
                            var element = heroStats.tmpdata.rany[k]
                            messageStr += "**" + element.name + ": **"
                            var anywounds = false
                            for(var i = 0; i<4; i+=1){
                                if(element.severity[i]!=0){
                                    anywounds = true
                                    messageStr += "" + wounds_names[i] + ": " + element.severity[i] + ", "
                                    element.severity[i].forEach(element2 => {
                                        sum_wound_percent += element2
                                    });
                                }
                            }
                            if(anywounds==true){
                                messageStr = messageStr.substring(0,messageStr.length-2)
                            }
                            else{
                                messageStr += "brak ran"
                            }
    
                            messageStr += "; "
                        });
                        messageStr+="\nCałkowita kara procentowa z ran: " + sum_wound_percent;
                        
                    }
                }
                


                bot.sendMessage({
                    to: channelID,
                    message: messageStr
                }); 

            break;


            case 'pomoc':

                var msgStr = ""

                if(message.length<7){
                    msgStr = ">>> Podstawowe komendy:\n"
                    msgStr += "**$rzut3** - po prostu wykonaj rzut 3k20\n"
                    msgStr += "**$bohater** *<statystyki bohatera w formacie json>* - dodaj bohatera w formacie JSON. Jeśli masz już bohatera, zostanie on zastąpiony, więc uważaj!\n"
                    msgStr += "**$staty** - sprawdź swoje statystyki (wymaga załadowanego bohatera)\n"
                    msgStr += "**$stan** - sprawdź stan (rany, choroby, utrudnienia) swojego bohatera\n"
                    msgStr += "**$test** *<zdolność>* - przetestuj zdolność używając 3k20 (wymaga załadowanego bohatera)\n"
                    msgStr += "**$rana** *<g/t/rl/rp/nl/np> <d/l/c/k>* - zadaj ranę w określonym miejscu (wymaga załadowanego bohatera)\n"
                    msgStr += "**$leczenie**  *[w/g/t/rl/rp/nl/np = w] [ilość = 5]* - ulecz określone procenty ran określonym miejscu\n"
                    msgStr += "**$pomoc** *[komenda]* - wypisz pomoc ogólną lub do sprecyzowanej komendy\n"
                    msgStr += "\nSprawdź <http://erhalis.net/aom/index.html>, by dowiedzieć się jeszcze więcej!"
    
                }
                else{
                    var skill_name = message.substring(7)
                    switch(skill_name){
                        case 'rzut1':
                            msgStr += "Użycie: **rzut1**\n"
                            msgStr += "Wykonuje najzwyklejszy w świecie rzut 1k20 i wypisuje wynik.\n"
                        case 'rzut3':
                            msgStr += "Użycie: **rzut3**\n"
                            msgStr += "Wykonuje rzut 3k20 bez określonych zdolności lub cech. Bot automatycznie odrzuci największą kość i pogrubi środkowy wynik.\n"
                        break
                        case 'bohater':
                            msgStr += "Użycie: **bohater** *<format bohatera>*\n"
                            msgStr += "Tworzy nowego bohatera przyporządkowanego do gracza lub zastępuje starego, jeśli jakiś jest. Jego format musi być poprawnie stworzonym formatem bohatera.\n"
                            msgStr += "Przykładowy format bohatera:\n"
                            msgStr += "```"
                            msgStr += "{\n\t\"meta\":\n\t{\n\t\t\"Imię\": \"Twoje Imię\",\n\t\t\"Pochodzenie\": \"Twoje pochodzenie\",\n\t\t\"Profesja\": \"Twoja profesja\"\n\t},\n\t\"stats\":\n\t {\n\t\t\"Zręczność\": 12,\n\t\t\"Percepcja\": 12,\n\t\t\"Charakter\": 12,\n\t\t\"Spryt\": 12, \n\t\t\"Budowa\": 12\n\t}, \n\t\"skills\": \n\t{\n\t\t\"Zdolność jeden\": 3, \n\t\t\"Zdolność dwa\": 2, \n\t\t\"Zdolność trzy\": 4\n\t}\n}"
                            msgStr += "```"
                            msgStr += "Zdolności powinny być pisanymi z dużej litery nazwami zdolności występującymi w Neuroshimie. Zamiast przykładowych wartości współczynników, możesz oczywiście podać swoje własne."
                        break
                        case 'staty':
                            msgStr += "Użycie: **staty**\n"
                            msgStr += "Sprawdza statystyki twojego bohatera.\n"
                        break
                        case 'test':
                            msgStr += "Użycie: **test** *<zdolność>*\n"
                            msgStr += "Wykonuje test otwarty wybranej zdolności. Musisz podać jej pełną nazwę - inaczej może nie zostać odczytana poprawnie.\n"
                            msgStr += "Przykład:\n*test Maszyny ciężkie*: wykonaj test maszyn ciężkich\n"
                        break
                        case 'rana':
                            msgStr += "Użycie: **rana** *<g/t/rl/rp/nl/np> <d/l/c/k>*\n"
                            msgStr += "Zadaje ranę bohaterowi w określonym miejscu (**g**łowa, **t**ułów, **r**ęka **l**ewa, **r**ęka prawa, **n**oga **l**ewa, **n**oga **p**rawa) o określonej ciężkości (**d**raśnięcie, **l**ekka, **c**iężka, **k**rytyczna\n"
                            msgStr += "Przykład:\n*rana t l*: zadaj lekką ranę na tułowiu\n"
                        break
                        case 'rrana':
                            msgStr += "Użycie: **rrana** *<g/t/rl/rp/nl/np> <d/l/c/k> <stopień>*\n"
                            msgStr += "(**r**ęcznie)**rana** pozwala ręcznie ustawić nową ranę na bohaterze, w kategorii ran o ustalonej ciężkości (z pominięciem wykonania testu odporności na ból), w miejscu sprecyzowanym przez pierwszy argument, o ciężkości sprecyzowanej przez drugi i o procentowym stopniu sprecyzowanym przez trzeci.\n"
                            msgStr += "Przykład:\n*rana t c 30*: dodaj ranę ciężką o utrudnieniu 30% na tułowiu\n"
                        break
                        case 'leczenie':
                            msgStr += "Użycie: **leczenie** *<w/g/t/rl/rp/nl/np> <stopień leczenia>*\n"
                            msgStr += "Leczy bohatera z ran w określonym miejscu (**w**szędzie, **g**łowa, **t**ułów, **r**ęka **l**ewa, **r**ęka prawa, **n**oga **l**ewa, **n**oga **p**rawae) o określony procent\n"
                            msgStr += "Przykład:\n*leczenie t 15*: ulecz rany na tułowiu o 15%\n"
                        break

                    }

                }

                bot.sendMessage({
                    to: channelID,
                    message: msgStr
                }); 
            break;

            default:
                bot.sendMessage({
                    to: channelID,
                    message: ">>> BZZZT! BZZZ! ERROR! Molochowe oprogramowanie nie rozpoznało tej komendy!\nWpisz $pomoc, żeby poznać listę komend."
                });

         }
     }
});