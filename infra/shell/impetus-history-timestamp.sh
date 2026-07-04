# IMPETUS — rastreabilidade temporal bash (HARDENING-01)
export HISTTIMEFORMAT='%F %T '
export HISTTIMESTAMPED=1
export HISTSIZE=50000
export HISTFILESIZE=100000
export HISTCONTROL=ignoredups:erasedups
shopt -s histappend
export PROMPT_COMMAND='history -a; history -n'
