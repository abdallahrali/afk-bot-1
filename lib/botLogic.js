function startAfkRoutine(bot) {
    // Jump every 20 seconds to prevent AFK kick
    setInterval(() => {
        if (bot && bot.entity) {
            bot.setControlState('jump', true)
            setTimeout(() => bot.setControlState('jump', false), 500)
        }
    }, 20000)
}

function startDataStream(io, bot) {
    // Send GPS/Health data to website every 1 second
    setInterval(() => {
        if (bot && bot.entity) {
            io.emit('botUpdate', {
                pos: bot.entity.position,
                health: bot.health,
                food: bot.food,
                username: bot.username
            })
        }
    }, 1000)
}

module.exports = { startAfkRoutine, startDataStream }