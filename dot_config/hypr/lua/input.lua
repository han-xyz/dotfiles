hl.config({
    input = {
        kb_layout  = "us,tr",
        kb_variant = ",intl", -- empty variant for us, intl for tr
        kb_model   = "",
        kb_options = "grp:win_space_toggle",
        kb_rules   = "",

        follow_mouse = 1,

        sensitivity = 0, -- -1.0 - 1.0, 0 means no modification.

        accel_profile = "flat",

        touchpad = {
            natural_scroll = false,
        },
    },
})
