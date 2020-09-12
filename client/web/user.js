let selected

$(() => {
  const update = () => {
    fetch(`${window.location.origin}/view`, {})
      .then(res => res.json())
      .then(x => {
        $('.status').text(x.network.status)
        $('.peers').text(x.network.peers)
        $('.head').text(x.chain.head)

        $('.raw').text(JSON.stringify(x))

        // setTimeout(update, 500)
      })
      .catch(() => {
        // setTimeout(update, 500)
      })

    fetch(`${window.location.origin}/chain`, {})
      .then(res => res.json())
      .then(chain => {
        $('.chain').empty()

        chain.map(x => {
          const ele = $(`<div><button>${x.hash}</button></div>`)

          ele.click(() => {
            $('.selected').empty()
            $('.selected').append(`<h1>${x.hash}</h1>`)

            fetch(`${window.location.origin}/block/${x.hash}`)
              .then(res => res.json())
              .then(block => {
                block.actions.map(a => {
                  const action = `
                  <hr />
                  <div>
                    ${Object.keys(a).map(k => `<div>${k}: ${JSON.stringify(a[k])}</div>`).join(' ')}
                  </div>
                  `

                  $('.selected').append(action)
                  // $('.selected').append(`<div>${JSON.stringify(a)}</div>`)
                })
                
              })
          })

          $('.chain').append(ele)
        })
      })
  }

  $('.refresh').click(() => {
    update()
  })

  setTimeout(update, 500)
})