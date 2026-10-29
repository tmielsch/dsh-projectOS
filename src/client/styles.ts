/** Styles of the manager page. Colors come from the DSH theme variables. */
export const CSS_TAG = '@tmielsch/dsh-projectos/manager.css'

export const CSS = `
.pos-page{--pos-gap:12px;display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#eee);font-size:13px;container-type:inline-size}
.pos-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;padding:18px 24px 6px}
.pos-head h1{margin:0;font-size:18px;font-weight:600}
.pos-head p{margin:0;color:var(--dsw-alias-label-tertiary,#999);font-size:12px}
.pos-workspaces{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 24px 4px}
.pos-label{color:var(--dsw-alias-label-tertiary,#999);font-size:11px;text-transform:uppercase;letter-spacing:.04em;margin-right:4px}
.pos-ws{cursor:pointer;display:inline-flex;gap:8px;align-items:center;border:0;border-radius:999px;padding:5px 12px;background:var(--dsw-alias-bg-layer-2,#2a2a2a);color:var(--dsw-alias-label-secondary,#bbb);font-size:12px}
.pos-ws:hover{background:var(--dsw-alias-interactive-bg-hover,#333)}
.pos-ws[aria-pressed=true]{color:var(--dsw-alias-label-primary,#fff);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary,#58f)}
.pos-onlyteams{margin-left:auto}
.pos-depts{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;padding:8px 24px}
.pos-dept{display:flex;flex-direction:column;gap:6px;border-radius:10px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2,#2a2a2a);box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l2,#444);min-width:0}
.pos-dept[aria-current=true]{box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary,#58f)}
.pos-dept[data-active=false]{opacity:.78}
.pos-depthead{display:flex;align-items:center;gap:8px;min-width:0}
.pos-deptname{cursor:pointer;flex:1;min-width:0;text-align:left;border:0;background:transparent;color:var(--dsw-alias-label-primary,#fff);font-size:14px;font-weight:600;padding:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pos-nameinput{flex:1;min-width:0;border-radius:6px;border:1px solid var(--dsw-alias-border-l3,#666);background:var(--dsw-alias-bg-base,#222);color:inherit;padding:3px 6px;font-size:13px}
.pos-pencil{flex:none;width:22px;height:22px;min-height:22px}
.pos-badge{flex:none;border-radius:999px;padding:2px 8px;font-size:10px;background:var(--dsw-alias-bg-base,#222);color:var(--dsw-alias-label-tertiary,#999)}
.pos-badge[data-active=true]{color:var(--dsw-alias-state-success-primary,#4c8)}
.pos-deptmeta{color:var(--dsw-alias-label-tertiary,#999);font-size:11px}
.pos-feed{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}
.pos-feed li{display:flex;gap:8px;font-size:11px;line-height:1.35;min-width:0}
.pos-feedtime{flex:none;width:62px;color:var(--dsw-alias-label-tertiary,#999);font-variant-numeric:tabular-nums}
.pos-feedtext{min-width:0;color:var(--dsw-alias-label-secondary,#bbb);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.pos-feed li[data-kind=thought] .pos-feedtext{font-style:italic}
.pos-live{margin:0 24px 10px;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-bg-subtle,rgba(255,255,255,.03))}
.pos-live h2{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#bbb)}
.pos-thought{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-style:italic;font-size:11px;line-height:1.35;color:var(--dsw-alias-label-secondary,#bbb);margin-top:4px}
.pos-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:8px 24px}
.pos-tab{cursor:pointer;border:0;border-radius:8px;padding:6px 11px;background:var(--dsw-alias-bg-layer-2,#2a2a2a);color:var(--dsw-alias-label-secondary,#bbb);font-size:12px;text-align:left}
.pos-tab:hover{background:var(--dsw-alias-interactive-bg-hover,#333)}
.pos-tab[aria-pressed=true]{color:var(--dsw-alias-label-primary,#fff);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary,#4a8)}
.pos-tab small{display:block;color:var(--dsw-alias-label-tertiary,#999);font-size:10px}
.pos-stats{display:flex;flex-wrap:wrap;gap:6px 18px;padding:2px 24px 10px;color:var(--dsw-alias-label-secondary,#bbb);font-size:12px}
.pos-stats b{color:var(--dsw-alias-label-primary,#fff);font-variant-numeric:tabular-nums}
.pos-failure{margin:0 24px 8px;color:var(--dsw-alias-state-error-primary,#e66);font-size:12px}
.pos-body{display:flex;flex:1;min-height:0;gap:var(--pos-gap);padding:0 24px 18px}
.pos-board{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(190px,1fr);gap:var(--pos-gap);flex:1;min-width:0;overflow:auto}
.pos-lane{display:flex;flex-direction:column;gap:8px;min-width:0;background:var(--dsw-alias-bg-subtle,rgba(255,255,255,.03));border-radius:10px;padding:10px}
.pos-lane h2{display:flex;align-items:center;gap:8px;margin:0 0 2px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#bbb)}
.pos-count{color:var(--dsw-alias-label-tertiary,#999);font-variant-numeric:tabular-nums;font-weight:400}
.pos-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-label-dimmed,#777)}
.pos-dot[data-lane=working]{background:var(--dsw-alias-state-success-primary,#4c8)}
.pos-dot[data-lane=starting]{background:var(--dsw-alias-state-warn-primary,#ea4)}
.pos-dot[data-lane=failed]{background:var(--dsw-alias-state-error-primary,#e66)}
.pos-dot[data-lane=done]{background:var(--dsw-alias-label-dimmed,#777)}
.pos-dot[data-lane=waiting]{background:var(--dsw-alias-state-business-primary,#58f)}
.pos-card{cursor:pointer;display:block;width:100%;text-align:left;border:0;border-radius:8px;padding:9px 10px;background:var(--dsw-alias-bg-layer-2,#2a2a2a);color:inherit;box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l2,#444)}
.pos-card:hover{box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l3,#666)}
.pos-card[aria-pressed=true]{box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary,#58f)}
.pos-card strong{display:block;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pos-card small{display:block;color:var(--dsw-alias-label-tertiary,#999);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pos-empty{color:var(--dsw-alias-label-tertiary,#999);font-size:11px;padding:4px 2px}
.pos-path{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;padding:0 24px 10px;font-size:12px}
.pos-crumb{cursor:pointer;border:0;border-radius:6px;padding:3px 8px;background:transparent;color:var(--dsw-alias-label-secondary,#bbb);font-size:12px}
.pos-crumb:hover{background:var(--dsw-alias-interactive-bg-hover,#333)}
.pos-crumb[aria-current=true]{color:var(--dsw-alias-label-primary,#fff);font-weight:600}
.pos-sep{color:var(--dsw-alias-label-tertiary,#999)}
.pos-note-line{display:block;font-style:normal;font-size:11px;line-height:1.35;color:var(--dsw-alias-label-secondary,#bbb);margin-top:3px;white-space:normal}
.pos-leadbtn{margin-left:10px;padding:3px 9px}
.pos-hint{margin-left:auto;color:var(--dsw-alias-label-tertiary,#999);font-size:11px}
.pos-cardwrap{display:flex;flex-direction:column;gap:4px}
.pos-cardrow{display:flex;gap:4px;align-items:stretch}
.pos-cardrow .pos-card{flex:1;min-width:0}
.pos-cardtools{display:flex;flex-direction:column;gap:4px}
.pos-mini{cursor:pointer;border:0;border-radius:6px;width:24px;flex:1;min-height:24px;background:var(--dsw-alias-bg-layer-2,#2a2a2a);color:var(--dsw-alias-label-secondary,#bbb);font-size:12px}
.pos-mini:hover{background:var(--dsw-alias-interactive-bg-hover,#444);color:var(--dsw-alias-label-primary,#fff)}
.pos-chev{display:inline-block;width:14px;color:var(--dsw-alias-label-tertiary,#999)}
.pos-kids{margin-left:14px;padding-left:8px;border-left:1px solid var(--dsw-alias-border-l2,#444);display:flex;flex-direction:column;gap:3px}
.pos-kid{cursor:pointer;display:flex;align-items:center;gap:7px;border:0;border-radius:6px;padding:5px 7px;background:var(--dsw-alias-bg-base,#222);color:inherit;text-align:left;font-size:12px;min-width:0}
.pos-kid:hover{background:var(--dsw-alias-interactive-bg-hover,#333)}
.pos-kidname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pos-kidstate{color:var(--dsw-alias-label-tertiary,#999);font-size:10px;flex:none}
.pos-more{cursor:pointer;border:0;border-radius:6px;padding:5px 8px;background:transparent;color:var(--dsw-alias-label-tertiary,#999);font-size:11px;text-align:left}
.pos-more:hover{color:var(--dsw-alias-label-primary,#fff)}
.pos-note{margin:24px;color:var(--dsw-alias-label-tertiary,#999)}
.pos-detail{flex:none;width:min(360px,40%);min-height:0;overflow:auto;background:var(--dsw-alias-bg-layer-2,#2a2a2a);border-radius:10px;padding:14px;box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l2,#444)}
.pos-detail h2{margin:0 0 2px;font-size:15px}
.pos-detail dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:10px 0;font-size:12px}
.pos-detail dt{color:var(--dsw-alias-label-tertiary,#999)}
.pos-detail dd{margin:0;overflow-wrap:anywhere}
.pos-detail h3{margin:14px 0 6px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#bbb)}
.pos-actions{display:flex;gap:8px;margin-top:10px}
.pos-btn{cursor:pointer;border:0;border-radius:7px;padding:6px 11px;font-size:12px;background:var(--dsw-alias-bg-layer-3,#3a3a3a);color:inherit}
.pos-btn:hover{background:var(--dsw-alias-interactive-bg-hover,#444)}
.pos-task{border-radius:8px;padding:8px 10px;margin-bottom:6px;background:var(--dsw-alias-bg-base,#222);box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l2,#444)}
.pos-task strong{font-size:12px;font-weight:500}
.pos-task small{display:block;color:var(--dsw-alias-label-tertiary,#999);font-size:11px;margin-top:2px}
.pos-err{color:var(--dsw-alias-state-error-primary,#e66)}
@container (width<=640px){.pos-body{flex-direction:column}.pos-detail{width:auto}}
`
